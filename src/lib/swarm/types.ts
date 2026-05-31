import type { AgentId, CaseResult } from "@/lib/verdict-data";

export interface CaseInput {
  situation: string;
  jurisdiction: string;
  mode: "client" | "lawyer";
  caseType?: string;
  kind?: "dispute" | "contract";
  fileName?: string | null;
  fileContent?: string | null;
}

export interface StructuredCase {
  parties: { role: string; name: string }[];
  jurisdiction: string;
  disputeType: string;
  legalDomain: string;
  keyFacts: string[];
  timeline: { date: string; event: string }[];
  claims: string[];
  summary: string;
}

export interface StatuteEntry {
  cite: string;
  summary: string;
  source?: string;
}

export interface PrecedentEntry {
  name: string;
  year: number;
  outcome: string;
  amount?: string;
  summary: string;
  whyRelevant: string;
}

export interface RiskAssessment {
  winProbability: number;
  confidence: number;
  estimatedCost: string;
  estimatedTimeline: string;
  strengths: string[];
  risks: string[];
  reasoning: string;
}

export interface StrategyOutput {
  recommendation: CaseResult["recommendation"];
  rationale: string;
  alternatives: { name: string; tradeoff: string }[];
}

export interface OutputMemos {
  lawyer: string;
  client: string;
}

export interface SwarmContext {
  input: CaseInput;
  case?: StructuredCase;
  research?: StatuteEntry[];
  precedents?: PrecedentEntry[];
  risk?: RiskAssessment;
  strategy?: StrategyOutput;
  memos?: OutputMemos;
}

export type AgentRunner = (
  ctx: SwarmContext,
  onLine: (line: string) => Promise<void>,
) => Promise<Partial<SwarmContext>>;

export interface AgentProgress {
  agentId: AgentId;
  status: "pending" | "running" | "complete" | "failed";
  streamLines: string[];
  sponsor?: string;
}

export interface CaseProgress {
  caseId: string;
  status: "pending" | "running" | "complete" | "failed";
  agents: AgentProgress[];
  error?: string;
}
