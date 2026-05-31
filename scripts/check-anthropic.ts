/**
 * Verify .env loading and AI API connectivity (Anthropic direct or TokenRouter).
 * Usage: npm run check:anthropic
 */
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnv } from "vite";
import { getAiEnvStatus } from "../src/lib/env.server.ts";
import { hasAiBackend } from "../src/lib/ai-config.server.ts";
import { verifyAiConnection } from "../src/lib/swarm/llm.server.ts";

const root = resolve(import.meta.dirname, "..");
Object.assign(process.env, loadEnv("development", root, ""));
Object.assign(process.env, loadEnv("development", root, "VITE_"));

console.log("=== AI env check ===\n");
console.log("Project root:", root);
console.log(".env exists:", existsSync(resolve(root, ".env")));

const env = getAiEnvStatus();
console.log("\nStatus:", env.status);
console.log("Provider:", env.provider ?? "none");
console.log("Message:", env.message);
console.log("hasAiBackend():", hasAiBackend());

if (!hasAiBackend()) {
  console.log("\n❌ Fix .env then re-run: npm run check:anthropic");
  process.exit(1);
}

console.log("\nCalling API (minimal request)…");
const result = await verifyAiConnection();
console.log("Result:", result.ok ? "✅ OK" : "❌ FAILED");
console.log("Provider:", result.provider);
console.log("Detail:", result.message);
if (result.model) console.log("Model:", result.model);

process.exit(result.ok ? 0 : 1);
