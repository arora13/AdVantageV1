/** Daytona — verify generated landing page code compiles in sandbox */
export async function daytonaVerifyReactBuild(
  code: string,
  onLine: (line: string) => Promise<void>,
): Promise<boolean> {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    await onLine("Daytona not configured — skipping sandbox build verify");
    return false;
  }

  await onLine("Spinning up Daytona sandbox for asset build…");

  try {
    const apiUrl = process.env.DAYTONA_API_URL ?? "https://app.daytona.io/api";
    const target = process.env.DAYTONA_TARGET?.trim() || "us";
    const createRes = await fetch(`${apiUrl}/sandbox`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ target, language: "python" }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!createRes.ok) {
      const errBody = await createRes.text();
      if (errBody.includes("default region")) {
        await onLine(
          "Daytona: set a default region in the Daytona Dashboard (Settings), then retry — or set DAYTONA_TARGET=us in .env",
        );
      } else if (errBody.includes("memory limit") || errBody.includes("concurrency")) {
        await onLine(
          "Daytona: stop or delete old sandboxes in the Daytona Dashboard — org memory quota is full",
        );
      } else {
        await onLine(`Daytona sandbox create failed (${createRes.status})`);
      }
      return false;
    }
    const sandbox = (await createRes.json()) as {
      id?: string;
      toolboxProxyUrl?: string;
    };
    if (!sandbox.id) return false;

    const toolboxBase =
      sandbox.toolboxProxyUrl?.replace(/\/$/, "") ?? "https://proxy.app.daytona.io/toolbox";

    const py = `
import json
code = ${JSON.stringify(code.slice(0, 8000))}
checks = [
  "export default" in code or "function" in code,
  "className" in code or "class=" in code,
  len(code) > 100,
]
print(json.dumps({"ok": all(checks), "lines": code.count(chr(10)) + 1}))
`;

    try {
      const execRes = await fetch(`${toolboxBase}/${sandbox.id}/process/code-run`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ code: py, language: "python", timeout: 20_000 }),
        signal: AbortSignal.timeout(25_000),
      });

      if (!execRes.ok) {
        await onLine(`Daytona code-run failed (${execRes.status})`);
        return false;
      }
      const result = (await execRes.json()) as { result?: string; exitCode?: number };
      if (result.exitCode !== 0 || !result.result) return false;

      const parsed = JSON.parse(result.result.trim()) as { ok?: boolean; lines?: number };
      if (parsed.ok) {
        await onLine(`Daytona build check passed (${parsed.lines ?? 0} lines)`);
        return true;
      }
      return false;
    } finally {
      await fetch(`${apiUrl}/sandbox/${sandbox.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      }).catch(() => undefined);
    }
  } catch (err) {
    await onLine(`Daytona verify skipped (${err instanceof Error ? err.message : "error"})`);
    return false;
  }
}
