import type { AgentId } from "@/lib/launch-data";

/** Client-safe fallback when server integration list is unavailable */
export const SPONSORS_OFFLINE = [
  {
    id: "apify",
    name: "Apify",
    tagline: "Lead Hunter",
    description: "Live social and web signals enrich contact discovery.",
    url: "https://apify.com",
    usedIn: "Lead Hunter",
  },
  {
    id: "daytona",
    name: "Daytona",
    tagline: "Asset Builder",
    description: "Sandbox checks verify generated landing page assets.",
    url: "https://daytona.io",
    usedIn: "Asset Builder",
  },
  {
    id: "tokenrouter",
    name: "Claude",
    tagline: "via TokenRouter",
    description: "AI strategy, contacts, content, and assets when your API key is set.",
    url: "https://tokenrouter.com",
    usedIn: "All AI agents",
  },
] as const;

export const AGENT_SPONSORS: Record<AgentId, { name: string; role: string } | null> = {
  cmo: { name: "Claude", role: "Strategy generation" },
  hunter: { name: "Apify", role: "When configured" },
  content: { name: "Claude", role: "Post drafts" },
  builder: { name: "Daytona", role: "Sandbox verify" },
  deploy: null,
};
