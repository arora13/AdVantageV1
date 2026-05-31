import type { AgentId, LaunchResult } from "@/lib/launch-data";
import { AGENTS } from "@/lib/launch-data";
import { getAgentSponsorLabel } from "./sponsor-config.server";

import {
  demoBuilderAgent,
  demoCmoAgent,
  demoContentAgent,
  demoDeployAgent,
  demoHunterAgent,
  finalizeLaunch,
} from "./demo-agents.server";
import type {
  AgentProgress,
  AgentRunner,
  GtmContext,
  LaunchInput,
  LaunchProgress,
} from "./types";

const PIPELINE: { id: AgentId; run: AgentRunner }[] = [
  { id: "cmo", run: demoCmoAgent },
  { id: "hunter", run: demoHunterAgent },
  { id: "content", run: demoContentAgent },
  { id: "builder", run: demoBuilderAgent },
  { id: "deploy", run: demoDeployAgent },
];

function buildResult(ctx: GtmContext): LaunchResult {
  return finalizeLaunch(ctx);
}

const memoryStore = new Map<
  string,
  { input: LaunchInput; progress: LaunchProgress; result?: LaunchResult }
>();

export function createMemoryLaunch(input: LaunchInput): string {
  const launchId = crypto.randomUUID();
  memoryStore.set(launchId, {
    input,
    progress: {
      launchId,
      status: "pending",
      agents: AGENTS.map((a) => ({
        agentId: a.id,
        status: "pending" as const,
        streamLines: [],
        sponsor: getAgentSponsorLabel(a.id),
      })),
    },
  });
  return launchId;
}

/** Run swarm in background — poll getMemoryLaunchProgress for live agent streams */
export function runLaunchAsync(launchId: string): void {
  void runLaunchMemory(launchId).catch((err) => {
    const entry = memoryStore.get(launchId);
    if (entry) {
      entry.progress.status = "failed";
      entry.progress.error = err instanceof Error ? err.message : "Swarm failed";
    }
  });
}

export async function runLaunchMemory(launchId: string): Promise<LaunchResult> {
  const entry = memoryStore.get(launchId);
  if (!entry) throw new Error("Launch not found");

  entry.progress.status = "running";
  let ctx: GtmContext = { input: entry.input };

  for (const step of PIPELINE) {
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

export function getMemoryLaunchProgress(launchId: string): LaunchProgress | null {
  return memoryStore.get(launchId)?.progress ?? null;
}

export function getMemoryLaunchResult(launchId: string): LaunchResult | null {
  return memoryStore.get(launchId)?.result ?? null;
}

export function approveMemoryLaunch(launchId: string): LaunchResult | null {
  const entry = memoryStore.get(launchId);
  if (!entry?.result) return null;
  entry.result = { ...entry.result, approved: true };
  return entry.result;
}

export async function getLaunchProgress(launchId: string): Promise<LaunchProgress> {
  const mem = getMemoryLaunchProgress(launchId);
  if (mem) return mem;
  throw new Error("Launch not found");
}

export async function getLaunchResult(launchId: string): Promise<LaunchResult | null> {
  return getMemoryLaunchResult(launchId);
}
