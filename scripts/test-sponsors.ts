/**
 * Smoke-test Apify + Daytona env keys (no secrets printed).
 * Usage: npm run test:sponsors
 */
import { loadEnv } from "vite";
import { isApifyConfigured, isDaytonaConfigured } from "../src/lib/gtm/sponsor-config.server";
import { apifyHuntLeads } from "../src/lib/gtm/sponsors/apify-leads.server";
import { daytonaVerifyReactBuild } from "../src/lib/gtm/sponsors/daytona-build.server";

const root = new URL("..", import.meta.url).pathname;
Object.assign(process.env, loadEnv("development", root, ""));

const lines: string[] = [];
const onLine = async (line: string) => {
  lines.push(line);
  console.log(" ", line);
};

async function main() {
  console.log("=== Sponsor integration check ===\n");
  console.log("Apify configured:", isApifyConfigured());
  console.log("Daytona configured:", isDaytonaConfigured());
  if (!isApifyConfigured()) {
    console.error("\n❌ APIFY_API_TOKEN missing or placeholder");
    process.exit(1);
  }

  console.log("\n--- Apify (Lead Hunter) ---");
  const signals = await apifyHuntLeads(
    "lack of local foot traffic",
    "Local cafe / restaurant",
    "Austin",
    onLine,
  );
  console.log(`Apify signals: ${signals.length}`);
  if (signals.length === 0) {
    console.log("⚠️ Apify returned 0 (token may work but query empty — check actor credits)");
  } else {
    console.log("✅ Apify OK — sample:", signals[0].title.slice(0, 60));
  }

  if (!isDaytonaConfigured()) {
    console.error("\n❌ DAYTONA_API_KEY missing");
    process.exit(1);
  }

  console.log("\n--- Daytona (Asset Builder) ---");
  const sampleReact = `export default function Landing() {
  return <div className="p-8 text-white bg-zinc-950"><h1 className="text-2xl">Test Cafe</h1></div>;
}`;
  const ok = await daytonaVerifyReactBuild(sampleReact, onLine);
  console.log(ok ? "✅ Daytona OK" : "⚠️ Daytona did not verify (API may differ — check stream above)");

  console.log("\nDone.");
  process.exit(0);
}

main().catch((e) => {
  console.error("FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
