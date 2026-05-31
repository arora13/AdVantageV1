import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

function parseEnvFile(content: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

/** Load .env into process.env for local dev/SSR. Production hosts inject env at runtime. */
export function ensureServerEnvLoaded(): void {
  if (process.env.NODE_ENV === "production") return;
  const mode = process.env.NODE_ENV ?? "development";
  const root = process.cwd();
  for (const name of [".env", ".env.local", `.env.${mode}`, `.env.${mode}.local`]) {
    const path = resolve(root, name);
    if (!existsSync(path)) continue;
    Object.assign(process.env, parseEnvFile(readFileSync(path, "utf8")));
  }
}

ensureServerEnvLoaded();
