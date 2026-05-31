/**
 * Multi-vertical smoke tests — cafe + SaaS (template mode, no API keys required)
 */
import {
  createMemoryLaunch,
  getMemoryLaunchProgress,
  getMemoryLaunchResult,
  runLaunchAsync,
} from "../src/lib/gtm/orchestrator.server";

const CASES = [
  {
    name: "Builder cafe (local)",
    input: {
      productDescription:
        "I want to open up a builder based cafe this spring. Coffee and lunch for construction crews near job sites.",
      launchGoal: "waitlist" as const,
    },
    expect: /cafe|coffee|builder|local|instagram|nextdoor/i,
    reject: /show hn/i,
  },
  {
    name: "DevTools SaaS",
    input: {
      productDescription:
        "ShipLog is a developer tool that turns GitHub PR comments into release notes automatically for eng teams.",
      productName: "ShipLog",
      launchGoal: "beta" as const,
    },
    expect: /developer|github|saas|hn|launch|shiplog/i,
    reject: /builder based cafe|nextdoor opening/i,
  },
  {
    name: "Family parking lot (local retail)",
    input: {
      productDescription:
        "Family owned parking lot in Austin — we want more weekday commuters and event-night traffic.",
      productName: "Arora Parking",
      launchGoal: "waitlist" as const,
    },
    expect: /parking|commuter|office|event|maps|austin/i,
    reject: /show hn|builder based cafe|shiplog/i,
  },
  {
    name: "Fitness studio (local service)",
    input: {
      productDescription:
        "Opening a boutique HIIT fitness studio downtown Austin in June. Small group classes, no contracts.",
      launchGoal: "waitlist" as const,
    },
    expect: /fitness|studio|local|class|austin/i,
    reject: /show hn: shiplog/i,
  },
];

async function runCase(c: (typeof CASES)[0]) {
  const launchId = createMemoryLaunch(c.input);
  runLaunchAsync(launchId);
  while (true) {
    const progress = getMemoryLaunchProgress(launchId);
    if (progress?.status === "complete") break;
    if (progress?.status === "failed") throw new Error(progress.error ?? "failed");
    await new Promise((r) => setTimeout(r, 200));
  }

  const result = getMemoryLaunchResult(launchId);
  if (!result) throw new Error("no result");
  const blob = JSON.stringify(result);
  if (!c.expect.test(blob)) throw new Error(`Expected pattern not found: ${c.expect}`);
  if (c.reject.test(blob)) throw new Error(`Rejected pattern found: ${c.reject}`);
  if (result.leads.length > 10) throw new Error(`Too many leads: ${result.leads.length}`);
  console.log(`  ✓ ${c.name} → ${result.productName} (${result.leads.length} contacts)`);
}

async function main() {
  console.log("=== AdVantage multi-vertical tests ===\n");
  for (const c of CASES) {
    await runCase(c);
  }
  console.log("\nPASSED: all verticals produce distinct output");
}

main().catch((e) => {
  console.error("\nFAILED:", e.message ?? e);
  process.exit(1);
});
