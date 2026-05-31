/**
 * InsForge removed from AdVantage GTM stack.
 * Stub keeps legacy verdict swarm modules compiling; persistence is in-memory only.
 */
export {
  hasAiBackend,
  isAnthropicConfigured,
  isClaudeConfigured,
  isTokenRouterConfigured,
} from "@/lib/ai-config.server";

export function isInsforgeConfigured(): boolean {
  return false;
}

export function isOpenRouterConfigured(): boolean {
  return false;
}

export function getInsforgeAdmin(): never {
  throw new Error("InsForge is not used in AdVantage. Launches run in memory.");
}

export const VERDICT_MODEL = "anthropic/claude-sonnet-4";
