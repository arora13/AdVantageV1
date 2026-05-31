/** Daytona — run agent tool calls in an isolated sandbox */
export async function daytonaParseDocument(
  fileName: string,
  content: string,
  onLine: (line: string) => Promise<void>,
): Promise<string> {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) {
    await onLine("Daytona not configured — parsing document inline");
    return content.slice(0, 12_000);
  }

  await onLine(`Spinning up Daytona sandbox for ${fileName}…`);

  try {
    const apiUrl = process.env.DAYTONA_API_URL ?? "https://app.daytona.io/api";
    const createRes = await fetch(`${apiUrl}/sandbox`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language: "python" }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!createRes.ok) {
      await onLine("Daytona sandbox unavailable — using direct text");
      return content.slice(0, 12_000);
    }

    const sandbox = (await createRes.json()) as { id?: string };
    const sandboxId = sandbox.id;
    if (!sandboxId) return content.slice(0, 12_000);

    await onLine("Daytona sandbox ready — extracting document text…");

    const escaped = JSON.stringify(content.slice(0, 50_000));
    const code = `
import json
text = json.loads(${JSON.stringify(escaped)})
lines = [l.strip() for l in text.splitlines() if l.strip()]
print(json.dumps({"lines": len(lines), "preview": "\\n".join(lines[:200])}))
`;

    const execRes = await fetch(`${apiUrl}/sandbox/${sandboxId}/process/code`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, language: "python" }),
      signal: AbortSignal.timeout(20_000),
    });

    if (execRes.ok) {
      const result = (await execRes.json()) as { result?: string };
      if (result.result) {
        try {
          const parsed = JSON.parse(result.result) as { preview?: string };
          await onLine(`Daytona extracted ${parsed.preview?.split("\n").length ?? 0} lines`);
          return parsed.preview ?? content.slice(0, 12_000);
        } catch {
          return result.result.slice(0, 12_000);
        }
      }
    }

    return content.slice(0, 12_000);
  } catch (err) {
    await onLine(
      `Daytona error (${err instanceof Error ? err.message : "unknown"}) — using inline parse`,
    );
    return content.slice(0, 12_000);
  }
}

/** Daytona — sandboxed win-probability calculation script */
export async function daytonaComputeRiskScore(
  precedentWins: number,
  totalPrecedents: number,
  strengthCount: number,
  riskCount: number,
  onLine: (line: string) => Promise<void>,
): Promise<{ score: number; confidence: number } | null> {
  const apiKey = process.env.DAYTONA_API_KEY;
  if (!apiKey) return null;

  await onLine("Running risk model in Daytona isolated environment…");

  try {
    const apiUrl = process.env.DAYTONA_API_URL ?? "https://app.daytona.io/api";
    const code = `
wins, total, strengths, risks = ${precedentWins}, ${totalPrecedents}, ${strengthCount}, ${riskCount}
base = (wins / max(total, 1)) * 100 if total else 50
adj = (strengths * 4) - (risks * 5)
score = max(15, min(92, round(base * 0.6 + 35 + adj)))
conf = max(5, min(15, 12 - abs(strengths - risks)))
print(f'{{"score": {score}, "confidence": {conf}}}')
`;

    const createRes = await fetch(`${apiUrl}/sandbox`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ language: "python" }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!createRes.ok) return null;
    const sandbox = (await createRes.json()) as { id?: string };
    if (!sandbox.id) return null;

    const execRes = await fetch(`${apiUrl}/sandbox/${sandbox.id}/process/code`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ code, language: "python" }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!execRes.ok) return null;
    const result = (await execRes.json()) as { result?: string };
    if (!result.result) return null;

    const parsed = JSON.parse(result.result.trim()) as {
      score: number;
      confidence: number;
    };
    await onLine(
      `Daytona risk model: ${parsed.score}% win probability (±${parsed.confidence}%)`,
    );
    return parsed;
  } catch {
    return null;
  }
}
