import type { LaunchResult } from "@/lib/launch-data";

export interface LaunchInput {
  productDescription: string;
  productName?: string;
  repoUrl?: string | null;
  launchGoal?: "waitlist" | "beta" | "paid";
}

export interface ProductProfile {
  productName: string;
  tagline: string;
  icp: string;
  painPoint: string;
  category: string;
  channels: string[];
}

export interface GtmContext {
  input: LaunchInput;
  profile?: ProductProfile & {
    kind?: import("./product-knowledge.server").BusinessKind;
    locationHint?: string | null;
    season?: "spring" | "summer" | "fall" | "winter" | null;
    launchAngle?: string;
  };
  strategy?: StrategyOutput;
  leads?: LaunchResult["leads"];
  content?: LaunchResult["content"];
  assets?: LaunchResult["assets"];
}

export interface StrategyOutput {
  timeline: LaunchResult["strategyTimeline"];
  rationale: string;
}

export type AgentRunner = (
  ctx: GtmContext,
  onLine: (line: string) => Promise<void>,
) => Promise<Partial<GtmContext>>;

export interface AgentProgress {
  agentId: import("@/lib/launch-data").AgentId;
  status: "pending" | "running" | "complete" | "failed";
  streamLines: string[];
  sponsor?: string;
}

export interface LaunchProgress {
  launchId: string;
  status: "pending" | "running" | "complete" | "failed";
  agents: AgentProgress[];
  error?: string;
}
