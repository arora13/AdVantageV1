/**
 * End-to-end swarm test — run with: npx tsx scripts/test-swarm-e2e.ts
 */
import {
  createMemoryCase,
  getMemoryProgress,
  getMemoryResult,
  runSwarmMemory,
} from "../src/lib/swarm/orchestrator.server";
import type { CaseInput } from "../src/lib/swarm/types";

const input: CaseInput = {
  situation:
    process.argv[2] ??
    "I was hit by a drunk driver last month in California. The police arrested him for DUI and I went to the hospital with a broken arm. I have the police report and medical bills.",
  jurisdiction: "California, USA",
  mode: "client",
  caseType: "Personal Injury",
  kind: "dispute",
};

async function main() {
  console.log("=== Verdict E2E Swarm Test ===\n");

  const caseId = createMemoryCase(input);
  console.log("Created case:", caseId);

  const swarmPromise = runSwarmMemory(caseId);

  // Poll progress while running
  let lastCompleted = -1;
  while (true) {
    const progress = getMemoryProgress(caseId);
    if (!progress) throw new Error("Progress lost");

    const completed = progress.agents.filter((a) => a.status === "complete").length;
    if (completed > lastCompleted) {
      const running = progress.agents.find((a) => a.status === "running");
      console.log(
        `\n[${completed}/6] ${running?.agentId ?? "done"} — latest lines:`,
      );
      for (const agent of progress.agents) {
        if (agent.streamLines.length) {
          const last = agent.streamLines[agent.streamLines.length - 1];
          console.log(`  ${agent.agentId}: ${last.slice(0, 80)}`);
        }
      }
      lastCompleted = completed;
    }

    if (progress.status === "complete" || progress.status === "failed") break;
    await new Promise((r) => setTimeout(r, 200));
  }

  await swarmPromise;

  const result = getMemoryResult(caseId);
  if (!result) {
    console.error("\nFAILED: No result produced");
    process.exit(1);
  }

  console.log("\n=== RESULT ===");
  console.log("Win probability:", result.winProbability + "%");
  console.log("Recommendation:", result.recommendation);
  console.log("Jurisdiction:", result.jurisdiction);
  console.log("Statutes:", result.statutes.length);
  console.log("Precedents:", result.precedents.length);
  console.log("Lawyer memo length:", result.memo.lawyer.length);
  console.log("Client memo length:", result.memo.client.length);

  console.log("Action pack:", result.actions?.headline);
  console.log("Artifacts:", result.actions?.artifacts.length);

  if (
    result.winProbability > 0 &&
    result.recommendation &&
    result.statutes.length > 0 &&
    result.precedents.length > 0 &&
    result.memo.lawyer.length > 100 &&
    result.memo.client.length > 100 &&
    result.lab?.liabilitySignal &&
    result.lab.evidenceGaps.length >= 3 &&
    result.lab.redTeam.length >= 2 &&
    result.actions?.artifacts.length >= 2 &&
    !result.memo.client.toLowerCase().includes("wrongful termination") &&
    !result.memo.client.toLowerCase().includes("employer") &&
    (result.disputeType.toLowerCase().includes("injury") ||
      result.disputeType.toLowerCase().includes("vehicle") ||
      result.disputeType.toLowerCase().includes("dui"))
  ) {
    console.log("\nPASSED: DUI/PI case produced domain-appropriate output");
  } else if (
    result.winProbability > 0 &&
    result.recommendation &&
    result.statutes.length > 0
  ) {
    console.log("\nPASSED: End-to-end swarm completed successfully");
  } else {
    console.error("\nFAILED: Result incomplete or wrong domain");
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("\nFAILED:", err);
  process.exit(1);
});
