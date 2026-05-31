/**
 * AdVantage GTM swarm E2E — in-process orchestrator + per-agent validation
 */
import {
  createMemoryLaunch,
  getMemoryLaunchProgress,
  getMemoryLaunchResult,
  runLaunchAsync,
} from "../src/lib/gtm/orchestrator.server";
import { MAX_LEADS } from "../src/lib/gtm/product-knowledge.server";
import type { LaunchInput } from "../src/lib/gtm/types";

const AGENT_IDS = ["cmo", "hunter", "content", "builder", "deploy"] as const;

const CAFE_INPUT =
  "I want to open up a builder based cafe this spring. Coffee and lunch for construction crews near job sites, plus neighbors. Looking for local partners and a spring soft opening.";

const input: LaunchInput = {
  productDescription: process.argv[2] ?? CAFE_INPUT,
  productName: process.argv[3] ?? undefined,
  repoUrl: "https://github.com/arora13/legal-insight-swarm",
  launchGoal: "waitlist",
};

const isCafeTest = /cafe|coffee|restaurant|builder/.test(input.productDescription.toLowerCase());

async function main() {
  console.log("=== AdVantage Swarm E2E (orchestrator) ===\n");
  console.log("Input:", input.productDescription.slice(0, 100) + "…\n");

  const launchId = createMemoryLaunch(input);
  runLaunchAsync(launchId);

  let lastCompleted = -1;
  while (true) {
    const progress = getMemoryLaunchProgress(launchId);
    if (!progress) throw new Error("Progress lost");

    const completed = progress.agents.filter((a) => a.status === "complete").length;
    if (completed > lastCompleted) {
      const running = progress.agents.find((a) => a.status === "running");
      const latest = running?.streamLines.at(-1);
      console.log(`[${completed}/5] ${running?.agentId ?? "done"}${latest ? ` — ${latest}` : ""}`);
      lastCompleted = completed;
    }

    if (progress.status === "complete") break;
    if (progress.status === "failed") throw new Error(progress.error ?? "Swarm failed");
    await new Promise((r) => setTimeout(r, 200));
  }

  const result = getMemoryLaunchResult(launchId);
  if (!result) throw new Error("No result");

  console.log("\n=== AGENTS ===");
  for (const id of AGENT_IDS) {
    const agent = getMemoryLaunchProgress(launchId)!.agents.find((a) => a.agentId === id);
    if (!agent || agent.status !== "complete") throw new Error(`Agent ${id} incomplete`);
    console.log(`  ✓ ${id.padEnd(8)} ${agent.streamLines.length} lines`);
  }

  console.log("\n=== OUTPUT ===");
  console.log("  Product:", result.productName);
  console.log("  Tagline:", result.tagline);
  console.log("  Contacts:", result.leads.length);
  console.log("  Content:", result.content.length);
  console.log("  Assets:", result.assets.length);
  console.log("  Sample contact:", result.leads[0]?.name);
  console.log("  Sample content:", result.content[0]?.platform, "—", result.content[0]?.title);

  if (result.leads.length > MAX_LEADS) throw new Error(`Too many contacts: ${result.leads.length} (max ${MAX_LEADS})`);
  if (result.leads.length < 5) throw new Error(`Too few contacts: ${result.leads.length}`);
  if (result.content.length < 4) throw new Error(`Expected 4+ content, got ${result.content.length}`);
  if (result.assets.length < 2) throw new Error(`Expected 2 assets, got ${result.assets.length}`);

  if (isCafeTest) {
    const blob = JSON.stringify(result).toLowerCase();
    if (blob.includes("show hn") && !blob.includes("instagram")) {
      throw new Error("Cafe launch still returning SaaS Show HN content");
    }
    if (!/cafe|coffee|builder|construction|local|spring|nextdoor|instagram|google business/.test(blob)) {
      throw new Error("Cafe launch output not domain-specific enough");
    }
    if (result.leads.some((l) => l.name === "Sarah Chen")) {
      throw new Error("Still using generic fake SaaS lead names");
    }
    console.log("\n  ✓ Cafe/builder domain checks passed");
  }

  console.log("\nPASSED: 5-agent swarm with relevant launch pack");
}

main().catch((e) => {
  console.error("\nFAILED:", e.message ?? e);
  process.exit(1);
});
