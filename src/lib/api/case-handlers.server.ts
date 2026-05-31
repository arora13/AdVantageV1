import { z } from "zod";

import {
  createMemoryCase,
  getMemoryResult,
  quickExploreMemory,
  runSwarmMemory,
} from "@/lib/swarm/orchestrator.server";
import { buildQuickLabResult } from "@/lib/swarm/quick-lab.server";
import type { CaseInput } from "@/lib/swarm/types";
import type { CaseResult } from "@/lib/verdict-data";

export const caseInputSchema = z.object({
  situation: z.string().min(20),
  jurisdiction: z.string().min(1),
  mode: z.enum(["client", "lawyer"]),
  caseType: z.string().optional(),
  kind: z.enum(["dispute", "contract"]).optional(),
  fileName: z.string().nullable().optional(),
  fileContent: z.string().nullable().optional(),
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

export async function parseCaseInput(request: Request): Promise<CaseInput | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const parsed = caseInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  return parsed.data;
}

export async function startCase(input: CaseInput): Promise<{ caseId: string; result?: CaseResult }> {
  const caseId = createMemoryCase(input);
  const result = await runSwarmMemory(caseId);
  return { caseId, result };
}

export async function quickExploreCase(
  input: CaseInput,
): Promise<{ caseId: string; result: CaseResult }> {
  return quickExploreMemory(input);
}

export async function getCaseResultById(caseId: string): Promise<CaseResult | null> {
  return getMemoryResult(caseId);
}

export async function handleCaseApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/case/start" && request.method === "POST") {
    const input = await parseCaseInput(request);
    if (input instanceof Response) return input;
    try {
      const data = await startCase(input);
      return json(data);
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : "Failed to start case" },
        500,
      );
    }
  }

  if (url.pathname === "/api/case/quick-explore" && request.method === "POST") {
    const input = await parseCaseInput(request);
    if (input instanceof Response) return input;
    try {
      const data = await quickExploreCase(input);
      return json(data);
    } catch (e) {
      return json(
        { error: e instanceof Error ? e.message : "Quick explore failed" },
        500,
      );
    }
  }

  if (url.pathname.startsWith("/api/case/result/") && request.method === "GET") {
    const caseId = url.pathname.split("/").pop();
    if (!caseId) return json({ error: "Missing case id" }, 400);
    const result = await getCaseResultById(caseId);
    if (!result) return json({ error: "Case not found" }, 404);
    return json(result);
  }

  return null;
}

export async function buildQuickExploreResult(input: CaseInput): Promise<CaseResult> {
  return buildQuickLabResult(input);
}
