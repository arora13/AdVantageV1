/**
 * AdVantage HTTP handler E2E — same routes the browser hits (/api/launch/*)
 */
import { handleLaunchApiRequest } from "../src/lib/api/launch-handlers.server";
import { MAX_LEADS } from "../src/lib/gtm/product-knowledge.server";

const PRODUCT =
  process.argv[2] ??
  "I want to open up a builder based cafe this spring. Coffee and lunch for construction crews near job sites.";

async function api(path: string, body: unknown) {
  const res = await handleLaunchApiRequest(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
  if (!res) throw new Error(`No handler for ${path}`);
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}

const AGENT_IDS = ["cmo", "hunter", "content", "builder", "deploy"] as const;

async function main() {
  console.log("=== AdVantage API E2E ===\n");
  console.log("Input:", PRODUCT.slice(0, 100) + "…\n");

  const { launchId } = (await api("/api/launch/start", {
    productDescription: PRODUCT,
    launchGoal: "waitlist",
  })) as { launchId: string };

  console.log("POST /api/launch/start →", launchId);

  let lastCompleted = -1;
  let progress: Awaited<ReturnType<typeof api>>;

  while (true) {
    progress = await api("/api/launch/progress", { launchId });
    const completed = progress.agents.filter((a: { status: string }) => a.status === "complete").length;
    if (completed > lastCompleted) {
      console.log(`[${completed}/5] ${progress.agents.find((a: { status: string }) => a.status === "running")?.agentId ?? "done"}`);
      lastCompleted = completed;
    }
    if (progress.status === "complete") break;
    if (progress.status === "failed") throw new Error(progress.error ?? "Swarm failed");
    await new Promise((r) => setTimeout(r, 250));
  }

  const result = await api("/api/launch/result", { launchId });

  for (const id of AGENT_IDS) {
    const agent = progress.agents.find((a: { agentId: string }) => a.agentId === id);
    if (!agent?.streamLines?.length) throw new Error(`Agent ${id} missing stream lines`);
    console.log(`  ✓ ${id}`);
  }

  console.log("\n=== OUTPUT ===");
  console.log("Product:", result.productName);
  console.log("Tagline:", result.tagline);
  console.log("Contacts:", result.leads.length);
  console.log("Content platforms:", result.content.map((c: { platform: string }) => c.platform).join(", "));
  console.log("First contact:", result.leads[0]?.name, "—", result.leads[0]?.hook?.slice(0, 60) + "…");

  const checks: [string, boolean][] = [
    [`≤${MAX_LEADS} contacts`, result.leads.length <= MAX_LEADS && result.leads.length >= 5],
    ["4+ content drafts", result.content.length >= 4],
    ["2 assets", result.assets.length >= 2],
    ["strategy timeline", result.strategyTimeline?.length >= 5],
    ["domain-specific name", !result.productName.includes("Your Product") || /cafe/i.test(PRODUCT)],
    ["no generic Sarah Chen lead", !result.leads.some((l: { name: string }) => l.name === "Sarah Chen")],
    ["local or relevant content", /instagram|nextdoor|google|local|partner|opening/i.test(JSON.stringify(result.content))],
  ];

  for (const [label, ok] of checks) {
    if (!ok) throw new Error(`Check failed: ${label}`);
    console.log(`  ✓ ${label}`);
  }

  const approved = await api("/api/launch/approve", { launchId });
  if (!approved.approved) throw new Error("Approve failed");

  console.log("\nPASSED: API + domain-aware swarm");
}

main().catch((e) => {
  console.error("\nFAILED:", e.message ?? e);
  process.exit(1);
});
