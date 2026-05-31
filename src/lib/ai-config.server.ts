import { isPlaceholderEnv } from "@/lib/env.server";
import { isTokenRouterConfigured } from "@/lib/tokenrouter.server";

export function isAnthropicConfigured(): boolean {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key || isPlaceholderEnv(key)) return false;
  return key.startsWith("sk-ant-");
}

/** Claude via direct Anthropic or TokenRouter proxy. */
export function isClaudeConfigured(): boolean {
  return isAnthropicConfigured() || isTokenRouterConfigured();
}

export function hasAiBackend(): boolean {
  return isClaudeConfigured();
}

export { isTokenRouterConfigured } from "@/lib/tokenrouter.server";
