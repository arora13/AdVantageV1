import type { AgentId } from "@/lib/verdict-data";

export const AGENT_SPONSORS: Record<AgentId, { name: string; role: string }> = {
  intake: { name: "Daytona", role: "Isolated document parsing" },
  research: { name: "Apify", role: "Statute & case law scraping" },
  precedent: { name: "InsForge AI", role: "Precedent analysis via Model Gateway" },
  risk: { name: "Daytona", role: "Sandboxed probability model" },
  strategy: { name: "Kalibr", role: "Failure-aware orchestration" },
  output: { name: "InsForge", role: "Storage & memo persistence" },
};

export const SPONSORS = [
  {
    id: "insforge",
    name: "InsForge",
    tagline: "Agent-native backend",
    description:
      "Database, storage, AI model gateway, and edge functions — the swarm's backbone from prompt to production.",
    url: "https://insforge.dev",
    usedIn: "All agents",
  },
  {
    id: "apify",
    name: "Apify",
    tagline: "Web scraping at scale",
    description:
      "Research Agent scrapes statutes and case law from the web for your jurisdiction.",
    url: "https://apify.com",
    usedIn: "Research Agent",
  },
  {
    id: "daytona",
    name: "Daytona",
    tagline: "Secure code execution",
    description:
      "Isolated sandboxes parse uploaded contracts and run the win-probability risk model.",
    url: "https://daytona.io",
    usedIn: "Intake & Risk Agents",
  },
  {
    id: "render",
    name: "Render",
    tagline: "Cloud deployment",
    description:
      "Hosts the Verdict frontend and API with zero-downtime deploys and autoscaling.",
    url: "https://render.com",
    usedIn: "Production",
  },
  {
    id: "kalibr",
    name: "Kalibr",
    tagline: "Agent orchestration",
    description:
      "Unified orchestration layer with automatic failure detection and recovery across the swarm.",
    url: "https://kalibr.ai",
    usedIn: "Swarm pipeline",
  },
  {
    id: "rtrvr",
    name: "Rtrvr.ai",
    tagline: "Web research agent",
    description:
      "Supplemental legal source retrieval when Apify returns sparse results.",
    url: "https://rtrvr.ai",
    usedIn: "Research Agent",
  },
  {
    id: "lightsprint",
    name: "Lightsprint.ai",
    tagline: "AI-native product factory",
    description:
      "Collaborative platform where AI coding agents ship Verdict from spec to production in hours.",
    url: "https://lightsprint.ai",
    usedIn: "Development",
  },
  {
    id: "nebius",
    name: "Nebius",
    tagline: "AI cloud infrastructure",
    description:
      "High-performance AI cloud powering model inference through InsForge's Model Gateway.",
    url: "https://nebius.com",
    usedIn: "AI inference",
  },
  {
    id: "brain2",
    name: "Brain2",
    tagline: "Case memory",
    description:
      "Persistent case context stored in InsForge — your second brain for legal analysis.",
    url: "https://brain2.ai",
    usedIn: "Case history",
  },
] as const;
