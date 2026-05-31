import {
  isAnthropicConfigured,
  isClaudeConfigured,
  isTokenRouterConfigured,
} from "@/lib/ai-config.server";
import type { AgentId } from "@/lib/launch-data";

function envSet(name: string): boolean {
  const v = process.env[name]?.trim();
  if (!v) return false;
  const lower = v.toLowerCase();
  return !(
    lower.includes("xxx") ||
    lower.includes("your-") ||
    lower.includes("changeme") ||
    lower === "apify_api_xxx"
  );
}

export function isApifyConfigured(): boolean {
  return envSet("APIFY_API_TOKEN");
}

export function isDaytonaConfigured(): boolean {
  return envSet("DAYTONA_API_KEY");
}

export type SponsorCard = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  usedIn: string;
};

const CATALOG: SponsorCard[] = [
  {
    id: "apify",
    name: "Apify",
    tagline: "Lead Hunter scraping",
    description:
      "Live Google/social search results merged into your contact list when APIFY_API_TOKEN is set.",
    url: "https://apify.com",
    usedIn: "Lead Hunter",
  },
  {
    id: "daytona",
    name: "Daytona",
    tagline: "Secure code execution",
    description:
      "Asset Builder runs a sandbox check on generated landing page code when DAYTONA_API_KEY is set.",
    url: "https://daytona.io",
    usedIn: "Asset Builder",
  },
  {
    id: "tokenrouter",
    name: "Claude",
    tagline: "via TokenRouter",
    description:
      "Your TokenRouter API key (sk-…) in .env routes to Claude — same models, no sk-ant- key required.",
    url: "https://tokenrouter.com",
    usedIn: "All AI agents",
  },
  {
    id: "anthropic",
    name: "Anthropic",
    tagline: "Claude direct",
    description: "Direct Claude API when ANTHROPIC_API_KEY is sk-ant-…",
    url: "https://anthropic.com",
    usedIn: "All AI agents",
  },
];

export function getActiveSponsors(): SponsorCard[] {
  const active: SponsorCard[] = [];
  if (isApifyConfigured()) active.push(CATALOG.find((s) => s.id === "apify")!);
  if (isDaytonaConfigured()) active.push(CATALOG.find((s) => s.id === "daytona")!);
  if (isTokenRouterConfigured()) active.push(CATALOG.find((s) => s.id === "tokenrouter")!);
  else if (isAnthropicConfigured()) active.push(CATALOG.find((s) => s.id === "anthropic")!);
  return active;
}

export function getAgentSponsorLabel(agentId: AgentId): string | undefined {
  switch (agentId) {
    case "cmo":
      if (isTokenRouterConfigured()) return "Claude (TokenRouter)";
      if (isAnthropicConfigured()) return "Claude (Anthropic)";
      return undefined;
    case "content":
      return isClaudeConfigured()
        ? isTokenRouterConfigured()
          ? "Claude (TokenRouter)"
          : "Claude (Anthropic)"
        : undefined;
    case "hunter": {
      const parts: string[] = [];
      if (isClaudeConfigured()) parts.push(isTokenRouterConfigured() ? "Claude" : "Claude");
      if (isApifyConfigured()) parts.push("Apify");
      return parts.length ? parts.join(" + ") : undefined;
    }
    case "builder": {
      const parts: string[] = [];
      if (isClaudeConfigured()) parts.push(isTokenRouterConfigured() ? "Claude" : "Claude");
      if (isDaytonaConfigured()) parts.push("Daytona");
      return parts.length ? parts.join(" + ") : undefined;
    }
    case "deploy":
      return undefined;
    default:
      return undefined;
  }
}

export function getIntegrationsStatus() {
  return {
    apify: isApifyConfigured(),
    daytona: isDaytonaConfigured(),
    anthropic: isAnthropicConfigured(),
    tokenrouter: isTokenRouterConfigured(),
    claude: isClaudeConfigured(),
    sponsors: getActiveSponsors(),
  };
}
