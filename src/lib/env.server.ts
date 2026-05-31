import fs from "node:fs";
import path from "node:path";
import { ensureServerEnvLoaded } from "@/lib/load-env.server";
import { isTokenRouterConfigured } from "@/lib/tokenrouter.server";

export function isPlaceholderEnv(value: string | undefined): boolean {
  if (!value?.trim()) return true;
  const v = value.trim().toLowerCase();
  if (
    v.includes("your-app") ||
    v.includes("your-anon") ||
    v.includes("your-admin") ||
    v.includes("your-daytona") ||
    v.includes("your-rtrvr") ||
    v === "changeme" ||
    v === "sk-ant-xxx" ||
    v === "apify_api_xxx" ||
    v === "sk-or-xxx"
  ) {
    return true;
  }
  if (/sk-ant-api\d*-xxx$/i.test(v) || /_xxx$/i.test(v)) return true;
  return false;
}

export type AiEnvStatus =
  | "no_env_file"
  | "missing_key"
  | "placeholder"
  | "invalid_format"
  | "tokenrouter_ready"
  | "ready";

export function getAiEnvStatus(): {
  status: AiEnvStatus;
  hasEnvFile: boolean;
  keyPresent: boolean;
  keyLength: number;
  provider: "anthropic" | "tokenrouter" | null;
  message: string;
} {
  ensureServerEnvLoaded();

  const root = process.cwd();
  const hasEnvFile = fs.existsSync(path.join(root, ".env"));
  const key = process.env.ANTHROPIC_API_KEY?.trim() ?? "";
  const tokenRouterKey = process.env.TOKENROUTER_API_KEY?.trim() ?? "";

  if (!hasEnvFile && !key && !tokenRouterKey) {
    return {
      status: "no_env_file",
      hasEnvFile: false,
      keyPresent: false,
      keyLength: 0,
      provider: null,
      message:
        "No .env file found. Add ANTHROPIC_API_KEY (sk-ant-…) or a TokenRouter key (sk-…) plus TOKENROUTER_BASE_URL.",
    };
  }

  if (isTokenRouterConfigured()) {
    const trKey = tokenRouterKey || key;
    return {
      status: "tokenrouter_ready",
      hasEnvFile,
      keyPresent: true,
      keyLength: trKey.length,
      provider: "tokenrouter",
      message: "TokenRouter API key detected — Claude via api.tokenrouter.com.",
    };
  }

  if (!key) {
    return {
      status: "missing_key",
      hasEnvFile,
      keyPresent: false,
      keyLength: 0,
      provider: null,
      message:
        "ANTHROPIC_API_KEY is empty in .env. Paste your TokenRouter or Anthropic key, save, and restart npm run dev.",
    };
  }

  if (isPlaceholderEnv(key)) {
    return {
      status: "placeholder",
      hasEnvFile,
      keyPresent: true,
      keyLength: key.length,
      provider: null,
      message: "ANTHROPIC_API_KEY is still a placeholder. Replace it with your real API key.",
    };
  }

  if (!key.startsWith("sk-ant-")) {
    return {
      status: "invalid_format",
      hasEnvFile,
      keyPresent: true,
      keyLength: key.length,
      provider: null,
      message:
        "API key is set but was not recognized. TokenRouter keys start with sk- and go in ANTHROPIC_API_KEY=. Restart npm run dev after saving .env.",
    };
  }

  return {
    status: "ready",
    hasEnvFile,
    keyPresent: true,
    keyLength: key.length,
    provider: "anthropic",
    message: "Anthropic API key detected (sk-ant-…).",
  };
}

/** @deprecated use getAiEnvStatus */
export function getAnthropicEnvStatus() {
  const s = getAiEnvStatus();
  return { ...s, status: s.status === "tokenrouter_ready" ? "ready" : s.status };
}
