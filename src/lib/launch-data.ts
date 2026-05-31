export type AgentId = "cmo" | "hunter" | "content" | "builder" | "deploy";

export interface AgentDef {
  id: AgentId;
  name: string;
  role: string;
  description: string;
  streamLines: string[];
}

export const AGENTS: AgentDef[] = [
  {
    id: "cmo",
    name: "CMO Agent",
    role: "Strategy & routing",
    description:
      "Breaks your product into a 30-day GTM plan and routes tasks to Hunter, Content, and Builder.",
    streamLines: [
      "Parsing product positioning…",
      "ICP: technical founders building AI tools",
      "Primary channels: Hacker News, r/SaaS, X",
      "Week 1: Show HN + 50 DMs · Week 2: Reddit threads",
      "30-day playbook drafted",
    ],
  },
  {
    id: "hunter",
    name: "Lead Hunter",
    role: "Contact discovery",
    description:
      "Finds 10 high-intent contacts — partners, communities, and people already looking for what you offer. Uses Apify when APIFY_API_TOKEN is set.",
    streamLines: [
      "Scanning local + social for intent signals…",
      "Matching contacts to your business type",
      "Pulling live threads when Apify is configured",
      "Merging live Apify search hits into contact list",
      "Compiled 10 targeted contacts with outreach hooks",
    ],
  },
  {
    id: "content",
    name: "Content Engine",
    role: "Reasoning loop",
    description:
      "Drafts Show HN posts, X threads, and personalized outreach — not generic spam.",
    streamLines: [
      "Drafting Show HN post with specific hook…",
      "Writing 5-part X thread from lead pain points",
      "Personalizing 10 cold DMs from Hunter data",
      "Subreddit comment templates for r/SaaS",
      "Content pack ready for review",
    ],
  },
  {
    id: "builder",
    name: "Asset Builder",
    role: "Landing assets",
    description:
      "Generates React/Tailwind waitlist pages and email HTML, with sandbox checks when available.",
    streamLines: [
      "Generating waitlist landing page (React + Tailwind)",
      "Building cold-email HTML template",
      "Running sandbox build verify when Daytona is configured",
      "Assets staged for deployment",
    ],
  },
  {
    id: "deploy",
    name: "Deployment Orchestrator",
    role: "Launch staging",
    description:
      "Stages contacts, drafts, and assets, with persistence when the workspace backend is available.",
    streamLines: [
      "Staging contacts + content drafts",
      "Linking verified assets to launch record",
      "Staging launch pack for your dashboard",
      "Launch ready — awaiting approval",
    ],
  },
];

export type LeadPlatform =
  | "twitter"
  | "reddit"
  | "linkedin"
  | "hackernews"
  | "instagram"
  | "google"
  | "nextdoor"
  | "facebook"
  | "email"
  | "local";

export interface LaunchLead {
  name: string;
  platform: LeadPlatform;
  handle: string;
  url: string;
  painSnippet: string;
  hook: string;
}

export interface LaunchContent {
  id: string;
  platform: string;
  title: string;
  body: string;
  status: "draft" | "approved";
}

export interface LaunchAsset {
  id: string;
  title: string;
  kind: "landing" | "email";
  code: string;
  buildStatus: "verified" | "pending";
}

export interface StrategyDay {
  day: number;
  channel: string;
  action: string;
}

export interface LaunchResult {
  productName: string;
  tagline: string;
  icp: string;
  strategyTimeline: StrategyDay[];
  leads: LaunchLead[];
  content: LaunchContent[];
  assets: LaunchAsset[];
  deploymentUrl: string;
  complianceStatus: "verified" | "pending";
  summary: string;
  approved: boolean;
}

export const MOCK_LAUNCH: LaunchResult = {
  productName: "AdVantage",
  tagline: "Your marketing team, on demand",
  icp: "Solo founders & small teams shipping dev tools",
  strategyTimeline: [
    { day: 1, channel: "Hacker News", action: "Post Show HN with demo video link" },
    { day: 2, channel: "X / Twitter", action: "Publish 5-part launch thread" },
    { day: 3, channel: "Reddit", action: "Value-first post in r/SaaS + r/startups" },
    { day: 7, channel: "LinkedIn", action: "Founder story + waitlist CTA" },
    { day: 14, channel: "Email", action: "DM top 50 leads from Hunter list" },
  ],
  leads: [],
  content: [],
  assets: [],
  deploymentUrl: "",
  complianceStatus: "verified",
  summary: "Demo launch pack — paste your product to generate a real one.",
  approved: false,
};
