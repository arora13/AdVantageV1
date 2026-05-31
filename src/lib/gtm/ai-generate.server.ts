import { hasAiBackend } from "@/lib/ai-config.server";

export { aiBuilderAssets, aiCmoStrategy, aiContentDrafts, aiHunterLeads } from "./ai-agents.server";

export function isAiModeEnabled(): boolean {
  return hasAiBackend();
}
