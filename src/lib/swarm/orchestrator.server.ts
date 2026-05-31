import type { AgentId, CaseResult } from "@/lib/verdict-data";
import { AGENTS } from "@/lib/verdict-data";
import { getInsforgeAdmin, hasAiBackend, isInsforgeConfigured } from "@/lib/insforge.server";

import { intakeFallback, runIntakeAgent } from "./agents/intake.server";
import { outputFallback, runOutputAgent } from "./agents/output.server";
import { precedentFallback, runPrecedentAgent } from "./agents/precedent.server";
import { researchFallback, runResearchAgent } from "./agents/research.server";
import { riskFallback, runRiskAgent } from "./agents/risk.server";
import { strategyFallback, runStrategyAgent } from "./agents/strategy.server";
import {
  demoIntakeAgent,
  demoOutputAgent,
  demoPrecedentAgent,
  demoResearchAgent,
  demoRiskAgent,
  demoStrategyAgent,
} from "./demo-agents.server";
import { wrapAgentWithKalibr } from "./sponsors/kalibr.server";
import { buildActionPack } from "./action-pack.server";
import { buildLabInsights } from "./lab-insights.server";
import { buildQuickLabResult } from "./quick-lab.server";
import type {
  AgentProgress,
  AgentRunner,
  CaseInput,
  CaseProgress,
  SwarmContext,
} from "./types";

const AGENT_SPONSORS: Partial<Record<AgentId, string>> = {
  intake: "Daytona + InsForge",
  research: "Apify + Rtrvr.ai + InsForge AI",
  precedent: "InsForge AI",
  risk: "Daytona + InsForge AI",
  strategy: "InsForge AI",
  output: "InsForge",
};

const LIVE_PIPELINE: {
  id: AgentId;
  run: AgentRunner;
  fallback: AgentRunner;
}[] = [
  {
    id: "intake",
    run: wrapAgentWithKalibr("Intake", runIntakeAgent, intakeFallback),
    fallback: intakeFallback,
  },
  {
    id: "research",
    run: wrapAgentWithKalibr("Research", runResearchAgent, researchFallback),
    fallback: researchFallback,
  },
  {
    id: "precedent",
    run: wrapAgentWithKalibr("Precedent", runPrecedentAgent, precedentFallback),
    fallback: precedentFallback,
  },
  {
    id: "risk",
    run: wrapAgentWithKalibr("Risk", runRiskAgent, riskFallback),
    fallback: riskFallback,
  },
  {
    id: "strategy",
    run: wrapAgentWithKalibr("Strategy", runStrategyAgent, strategyFallback),
    fallback: strategyFallback,
  },
  {
    id: "output",
    run: wrapAgentWithKalibr("Output", runOutputAgent, outputFallback),
    fallback: outputFallback,
  },
];

const DEMO_PIPELINE: { id: AgentId; run: AgentRunner; fallback: AgentRunner }[] = [
  { id: "intake", run: demoIntakeAgent, fallback: demoIntakeAgent },
  { id: "research", run: demoResearchAgent, fallback: demoResearchAgent },
  { id: "precedent", run: demoPrecedentAgent, fallback: demoPrecedentAgent },
  { id: "risk", run: demoRiskAgent, fallback: demoRiskAgent },
  { id: "strategy", run: demoStrategyAgent, fallback: demoStrategyAgent },
  { id: "output", run: demoOutputAgent, fallback: demoOutputAgent },
];

function getPipeline() {
  return hasAiBackend() ? LIVE_PIPELINE : DEMO_PIPELINE;
}

function buildResult(ctx: SwarmContext): CaseResult {
  const c = ctx.case!;
  const risk = ctx.risk!;
  const strategy = ctx.strategy!;
  const lab = buildLabInsights(
    ctx.input.situation,
    c,
    risk,
    strategy,
    ctx.input.caseType,
  );
  const actions = buildActionPack(
    ctx.input.situation,
    c,
    risk,
    strategy,
    lab,
    ctx.input.caseType,
  );
  return {
    winProbability: risk.winProbability,
    confidence: risk.confidence,
    recommendation: strategy.recommendation,
    estimatedCost: risk.estimatedCost,
    estimatedTimeline: risk.estimatedTimeline,
    jurisdiction: c.jurisdiction,
    disputeType: c.disputeType,
    strengths: risk.strengths,
    risks: risk.risks,
    statutes: ctx.research ?? [],
    precedents: (ctx.precedents ?? []).map(({ whyRelevant: _, ...p }) => p),
    strategy: {
      primary: strategy.recommendation,
      rationale: strategy.rationale,
      alternatives: strategy.alternatives,
    },
    memo: ctx.memos ?? { lawyer: "", client: "" },
    lab,
    actions,
  };
}

async function appendStreamLine(
  caseId: string,
  agentId: AgentId,
  line: string,
): Promise<void> {
  if (!isInsforgeConfigured()) return;
  const db = getInsforgeAdmin().database;

  const { data: row } = await db
    .from("agent_runs")
    .select("stream_lines")
    .eq("case_id", caseId)
    .eq("agent_id", agentId)
    .single();

  const lines = [...((row?.stream_lines as string[]) ?? []), line];
  await db
    .from("agent_runs")
    .update({ stream_lines: lines })
    .eq("case_id", caseId)
    .eq("agent_id", agentId);
}

async function setAgentStatus(
  caseId: string,
  agentId: AgentId,
  status: AgentProgress["status"],
  extra?: { output?: unknown; started_at?: string; completed_at?: string },
): Promise<void> {
  if (!isInsforgeConfigured()) return;
  await getInsforgeAdmin()
    .database.from("agent_runs")
    .update({ status, ...extra })
    .eq("case_id", caseId)
    .eq("agent_id", agentId);
}

export async function createCaseRecord(input: CaseInput): Promise<string> {
  const db = getInsforgeAdmin().database;

  const { data: caseRow, error } = await db
    .from("cases")
    .insert([
      {
        situation: input.situation,
        jurisdiction: input.jurisdiction,
        mode: input.mode,
        case_type: input.caseType,
        kind: input.kind,
        file_name: input.fileName,
        status: "pending",
      },
    ])
    .select("id")
    .single();

  if (error || !caseRow?.id) {
    throw new Error(error?.message ?? "Failed to create case in InsForge");
  }

  const caseId = caseRow.id as string;

  await db.from("agent_runs").insert(
    AGENTS.map((a) => ({
      case_id: caseId,
      agent_id: a.id,
      status: "pending",
      stream_lines: [],
      sponsor: AGENT_SPONSORS[a.id],
    })),
  );

  if (input.fileContent && input.fileName) {
    try {
      const bucket = getInsforgeAdmin().storage.from("verdict-documents");
      const path = `${caseId}/${input.fileName}`;
      const blob = new Blob([input.fileContent], { type: "text/plain" });
      await bucket.upload(path, blob);
    } catch {
      // bucket may not exist yet — non-fatal
    }
  }

  return caseId;
}

export async function runSwarm(caseId: string, input: CaseInput): Promise<CaseResult> {
  const db = getInsforgeAdmin().database;
  await db.from("cases").update({ status: "running" }).eq("id", caseId);

  let ctx: SwarmContext = { input };

  for (const step of getPipeline()) {
    await setAgentStatus(caseId, step.id, "running", {
      started_at: new Date().toISOString(),
    });

    const onLine = async (line: string) => {
      await appendStreamLine(caseId, step.id, line);
    };

    try {
      const partial = await step.run(ctx, onLine);
      ctx = { ...ctx, ...partial };
      await setAgentStatus(caseId, step.id, "complete", {
        output: partial,
        completed_at: new Date().toISOString(),
      });
    } catch (err) {
      await appendStreamLine(
        caseId,
        step.id,
        `Error: ${err instanceof Error ? err.message : "unknown"}`,
      );
      await setAgentStatus(caseId, step.id, "failed", {
        completed_at: new Date().toISOString(),
      });
      throw err;
    }
  }

  const result = buildResult(ctx);

  await db.from("case_results").upsert([{ case_id: caseId, result }]);
  await db
    .from("cases")
    .update({ status: "complete", updated_at: new Date().toISOString() })
    .eq("id", caseId);

  return result;
}

export async function getCaseProgress(caseId: string): Promise<CaseProgress> {
  const db = getInsforgeAdmin().database;

  const { data: caseRow } = await db
    .from("cases")
    .select("status, error_message")
    .eq("id", caseId)
    .single();

  const { data: runs } = await db
    .from("agent_runs")
    .select("agent_id, status, stream_lines, sponsor")
    .eq("case_id", caseId)
    .order("started_at", { ascending: true });

  return {
    caseId,
    status: (caseRow?.status as CaseProgress["status"]) ?? "pending",
    error: caseRow?.error_message ?? undefined,
    agents: AGENTS.map((a) => {
      const run = runs?.find((r) => r.agent_id === a.id);
      return {
        agentId: a.id,
        status: (run?.status as AgentProgress["status"]) ?? "pending",
        streamLines: (run?.stream_lines as string[]) ?? [],
        sponsor: run?.sponsor as string | undefined,
      };
    }),
  };
}

export async function getCaseResult(caseId: string): Promise<CaseResult | null> {
  const { data } = await getInsforgeAdmin()
    .database.from("case_results")
    .select("result")
    .eq("case_id", caseId)
    .maybeSingle();

  return (data?.result as CaseResult) ?? null;
}

export async function markCaseFailed(caseId: string, message: string): Promise<void> {
  await getInsforgeAdmin()
    .database.from("cases")
    .update({ status: "failed", error_message: message })
    .eq("id", caseId);
}

/** In-memory fallback when InsForge env vars are not set (local UI demo) */
const memoryStore = new Map<
  string,
  { input: CaseInput; progress: CaseProgress; result?: CaseResult }
>();

export function createMemoryCase(input: CaseInput): string {
  const caseId = crypto.randomUUID();
  memoryStore.set(caseId, {
    input,
    progress: {
      caseId,
      status: "pending",
      agents: AGENTS.map((a) => ({
        agentId: a.id,
        status: "pending" as const,
        streamLines: [],
        sponsor: AGENT_SPONSORS[a.id],
      })),
    },
  });
  return caseId;
}

export async function runSwarmMemory(caseId: string): Promise<CaseResult> {
  const entry = memoryStore.get(caseId);
  if (!entry) throw new Error("Case not found");

  entry.progress.status = "running";
  let ctx: SwarmContext = { input: entry.input };

  for (const step of getPipeline()) {
    const agent = entry.progress.agents.find((a) => a.agentId === step.id)!;
    agent.status = "running";

    const onLine = async (line: string) => {
      agent.streamLines.push(line);
    };

    const partial = await step.run(ctx, onLine);
    ctx = { ...ctx, ...partial };
    agent.status = "complete";
  }

  const result = buildResult(ctx);
  entry.result = result;
  entry.progress.status = "complete";
  return result;
}

export function getMemoryProgress(caseId: string): CaseProgress | null {
  return memoryStore.get(caseId)?.progress ?? null;
}

export function getMemoryResult(caseId: string): CaseResult | null {
  return memoryStore.get(caseId)?.result ?? null;
}

export function getMemoryCaseInput(caseId: string): CaseInput | null {
  return memoryStore.get(caseId)?.input ?? null;
}

/** Instant explore — skip the pipeline animation, land straight in Situation Lab */
export async function quickExploreMemory(
  input: CaseInput,
): Promise<{ caseId: string; result: CaseResult }> {
  const caseId = createMemoryCase(input);
  const result = await buildQuickLabResult(input);
  const entry = memoryStore.get(caseId)!;
  entry.result = result;
  entry.progress.status = "complete";
  for (const agent of entry.progress.agents) {
    agent.status = "complete";
    agent.streamLines = ["Quick lab — skipped full pipeline"];
  }
  return { caseId, result };
}

export async function getCaseSituation(caseId: string): Promise<string | null> {
  if (isInsforgeConfigured()) {
    const { data } = await getInsforgeAdmin()
      .database.from("cases")
      .select("situation")
      .eq("id", caseId)
      .single();
    return (data?.situation as string) ?? null;
  }
  return memoryStore.get(caseId)?.input.situation ?? null;
}
