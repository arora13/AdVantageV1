import { isPlaceholderEnv } from "@/lib/env.server";

const DEFAULT_BASE = "https://api.tokenrouter.com/v1";
const DEFAULT_MODEL = "anthropic/claude-opus-4.7";

export function getTokenRouterApiKey(): string | undefined {
  const dedicated = process.env.TOKENROUTER_API_KEY?.trim();
  if (dedicated && !isPlaceholderEnv(dedicated)) return dedicated;

  const anthropic = process.env.ANTHROPIC_API_KEY?.trim();
  if (anthropic && !isPlaceholderEnv(anthropic) && !anthropic.startsWith("sk-ant-")) {
    return anthropic;
  }
  return undefined;
}

export function getTokenRouterBaseUrl(): string {
  return (process.env.TOKENROUTER_BASE_URL?.trim() || DEFAULT_BASE).replace(/\/$/, "");
}

export function getTokenRouterModel(): string {
  return process.env.TOKENROUTER_MODEL?.trim() || DEFAULT_MODEL;
}

export function isTokenRouterConfigured(): boolean {
  return Boolean(getTokenRouterApiKey());
}
