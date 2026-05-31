/**
 * Tests server functions the same way the browser does (via createServerFn RPC).
 * Requires dev server running — discovers function IDs from the client bundle.
 * Run: npm run dev && npm run test:rpc
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { defaultSerovalPlugins } from "@tanstack/router-core";
import { fromCrossJSON, toJSONAsync } from "seroval";

const BASE = process.env.VERDICT_URL ?? "http://localhost:4173";

function findFnId(name: string): string {
  const serverDir = join(process.cwd(), "dist/server/assets");
  const serverFiles = readdirSync(serverDir)
    .filter((f) => f.startsWith("verdict.functions-") && f.endsWith(".js"))
    .map((f) => ({ f, size: readFileSync(join(serverDir, f), "utf8").length }))
    .sort((a, b) => b.size - a.size);

  const serverFile = serverFiles[0]?.f;
  if (!serverFile) throw new Error("Run npm run build first");

  const src = readFileSync(join(serverDir, serverFile), "utf8");
  const block = src.match(
    new RegExp(`${name}_createServerFn_handler = createServerRpc\\(\\{\\s*id: "([a-f0-9]{64})"`),
  );
  if (!block) throw new Error(`Function ID not found for ${name}`);
  return block[1];
}

async function callServerFn(id: string, data: unknown) {
  const payload = JSON.stringify(await toJSONAsync({ data }));
  const res = await fetch(`${BASE}/_serverFn/${id}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, application/x-tss-framed, application/x-ndjson",
      "x-tsr-serverFn": "true",
    },
    body: payload,
  });

  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text.slice(0, 300)}`);

  const parsed = fromCrossJSON(JSON.parse(text), {
    plugins: defaultSerovalPlugins,
  }) as {
    result?: unknown;
    error?: unknown;
  };
  if (parsed.error) throw parsed.error;
  return parsed.result;
}

async function main() {
  console.log("=== Verdict RPC E2E (via dev server) ===\n");

  await fetch(BASE).then((r) => {
    if (!r.ok) throw new Error(`Dev server not reachable at ${BASE}`);
  });

  // Dev mode uses different IDs than production build — extract from dev server's manifest
  // Fallback: use vite preview after build for stable IDs
  const startId = findFnId("startCaseAnalysis");
  const pollId = findFnId("pollCaseProgress");
  const resultId = findFnId("fetchCaseResult");

  console.log("Using server fn IDs from build output");

  const { caseId } = (await callServerFn(startId, {
    situation:
      "I was hit by a drunk driver in California. Police arrested him for DUI. I broke my arm and have hospital bills and the police report.",
    jurisdiction: "California, USA",
    mode: "client",
    caseType: "Personal Injury",
    kind: "dispute",
    fileName: null,
    fileContent: null,
  })) as { caseId: string };

  console.log("Case:", caseId);

  for (let i = 0; i < 120; i++) {
    const progress = (await callServerFn(pollId, { caseId })) as {
      status: string;
      agents: { status: string }[];
    };
    const done = progress.agents.filter((a) => a.status === "complete").length;
    process.stdout.write(`\r  ${done}/6 — ${progress.status}   `);
    if (progress.status === "complete") break;
    if (progress.status === "failed") throw new Error("Swarm failed");
    await new Promise((r) => setTimeout(r, 400));
  }

  const result = (await callServerFn(resultId, { caseId })) as {
    winProbability: number;
    recommendation: string;
    disputeType: string;
    memo: { client: string };
  };

  console.log(`\n\nType: ${result.disputeType}`);
  console.log(`Win: ${result.winProbability}% | ${result.recommendation}`);
  if (
    !result.disputeType.toLowerCase().includes("injury") &&
    !result.disputeType.toLowerCase().includes("vehicle")
  ) {
    throw new Error("Wrong case type — expected personal injury");
  }
  if (result.memo.client.toLowerCase().includes("employer")) {
    throw new Error("Memo still references employment law");
  }
  console.log("\nPASSED");
}

main().catch((e) => {
  console.error("\nFAILED:", e.message ?? e);
  process.exit(1);
});
