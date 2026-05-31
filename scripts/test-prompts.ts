/**
 * Fast prompt → contacts/posts check (template + pad path, no live AI).
 * Usage: ANTHROPIC_API_KEY= npm run test:prompts
 */
import {
  createMemoryLaunch,
  getMemoryLaunchResult,
  getMemoryLaunchProgress,
  runLaunchAsync,
} from "../src/lib/gtm/orchestrator.server";

const PROMPTS = [
  {
    name: "Family parking lot",
    input: {
      productDescription:
        "Family owned parking lot in Austin — we want more weekday commuters and event-night traffic.",
      productName: "Arora Parking",
      launchGoal: "waitlist" as const,
    },
    expectContact: /parking|commuter|office|event|maps/i,
    rejectContact: /show hn|shiplog/i,
  },
  {
    name: "Small family cafe",
    input: {
      productDescription: "Small family cafe opening downtown — coffee, pastries, neighborhood regulars.",
      launchGoal: "waitlist" as const,
    },
    expectContact: /cafe|coffee|nextdoor|neighbor|maps|restaurant/i,
    rejectContact: /show hn/i,
  },
  {
    name: "Used car lot",
    input: {
      productDescription: "Family owned used car dealership in Dallas — trucks under $25k, honest pricing.",
      launchGoal: "beta" as const,
    },
    expectContact: /car|dealer|truck|marketplace|mechanic|maps/i,
    rejectContact: /coffee shop opening/i,
  },
];

async function runOne(p: (typeof PROMPTS)[0]) {
  const launchId = createMemoryLaunch(p.input);
  runLaunchAsync(launchId);
  while (true) {
    const progress = getMemoryLaunchProgress(launchId);
    if (progress?.status === "complete") break;
    if (progress?.status === "failed") throw new Error(progress.error ?? "failed");
    await new Promise((r) => setTimeout(r, 150));
  }
  const result = getMemoryLaunchResult(launchId);
  if (!result) throw new Error("no result");

  const blob = JSON.stringify(result);
  if (result.leads.length < 5) throw new Error(`Only ${result.leads.length} contacts`);
  if (result.content.length < 3) throw new Error(`Only ${result.content.length} posts`);
  if (!p.expectContact.test(blob)) throw new Error(`Missing expected contacts: ${p.expectContact}`);
  if (p.rejectContact.test(blob)) throw new Error(`Found rejected pattern: ${p.rejectContact}`);

  console.log(`  ✓ ${p.name}`);
  console.log(`    ${result.productName} · ${result.leads.length} contacts · ${result.content.length} posts`);
  console.log(`    contacts: ${result.leads.slice(0, 2).map((l) => l.name).join(" | ")}`);
}

async function main() {
  console.log("=== Prompt → pack check (templates + padding) ===\n");
  for (const p of PROMPTS) await runOne(p);
  console.log("\nPASSED: contacts + posts for varied local prompts");
}

main().catch((e) => {
  console.error("\nFAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
