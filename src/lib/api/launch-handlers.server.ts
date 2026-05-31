import { z } from "zod";

import {
  approveMemoryLaunch,
  createMemoryLaunch,
  getLaunchProgress,
  getLaunchResult,
  runLaunchAsync,
} from "@/lib/gtm/orchestrator.server";
import type { LaunchInput } from "@/lib/gtm/types";
import type { LaunchResult } from "@/lib/launch-data";
import { getAiEnvStatus } from "@/lib/env.server";
import { hasAiBackend } from "@/lib/ai-config.server";
import { getIntegrationsStatus } from "@/lib/gtm/sponsor-config.server";
import { verifyAiConnection } from "@/lib/swarm/llm.server";

export const launchInputSchema = z.object({
  productDescription: z.string().min(10, "Describe your business in at least 10 characters"),
  productName: z.string().optional(),
  repoUrl: z
    .union([z.string().url(), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v == null ? null : v)),
  launchGoal: z.enum(["waitlist", "beta", "paid"]).optional(),
});

function json(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
}

async function parseLaunchInput(request: Request): Promise<LaunchInput | Response> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  const parsed = launchInputSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: parsed.error.flatten().fieldErrors }, 400);
  }
  return parsed.data;
}

export async function startLaunch(
  input: LaunchInput,
): Promise<{ launchId: string }> {
  const launchId = createMemoryLaunch(input);
  runLaunchAsync(launchId);
  return { launchId };
}

export async function getLaunchResultById(launchId: string): Promise<LaunchResult | null> {
  return getLaunchResult(launchId);
}

export async function approveLaunch(launchId: string): Promise<LaunchResult | null> {
  return approveMemoryLaunch(launchId);
}

export async function handleLaunchApiRequest(request: Request): Promise<Response | null> {
  const url = new URL(request.url);

  if (url.pathname === "/api/launch/ai-status" && request.method === "GET") {
    const aiEnv = getAiEnvStatus();
    const verify = hasAiBackend() ? await verifyAiConnection() : null;
    return json({
      ai: Boolean(verify?.ok),
      aiEnv,
      anthropicEnv: aiEnv,
      verify,
      sponsors: getIntegrationsStatus(),
    });
  }

  if (url.pathname === "/api/launch/start" && request.method === "POST") {
    const input = await parseLaunchInput(request);
    if (input instanceof Response) return input;
    try {
      return json(await startLaunch(input));
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Launch failed" }, 500);
    }
  }

  if (url.pathname === "/api/launch/progress" && request.method === "POST") {
    let body: { launchId?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (!body.launchId) return json({ error: "launchId required" }, 400);
    try {
      const progress = await getLaunchProgress(body.launchId);
      return json(progress);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Not found" }, 404);
    }
  }

  if (url.pathname === "/api/launch/result" && request.method === "POST") {
    let body: { launchId?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (!body.launchId || !z.string().uuid().safeParse(body.launchId).success) {
      return json({ error: "Valid launchId required" }, 400);
    }
    try {
      const result = await getLaunchResultById(body.launchId);
      if (!result) return json({ error: "Result not ready" }, 404);
      return json(result);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Failed to load" }, 500);
    }
  }

  if (url.pathname === "/api/launch/approve" && request.method === "POST") {
    let body: { launchId?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    if (!body.launchId) return json({ error: "launchId required" }, 400);
    try {
      const result = await approveLaunch(body.launchId);
      if (!result) return json({ error: "Launch not found" }, 404);
      return json(result);
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Approve failed" }, 500);
    }
  }

  // Legacy routes
  if (url.pathname === "/api/case/start" || url.pathname === "/api/case/quick") {
    const input = await parseLaunchInput(request);
    if (input instanceof Response) return input;
    try {
      return json(await startLaunch(input));
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Launch failed" }, 500);
    }
  }

  if (url.pathname === "/api/case/result" && request.method === "POST") {
    let body: { caseId?: string; launchId?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const id = body.launchId ?? body.caseId;
    if (!id) return json({ error: "launchId required" }, 400);
    const result = await getLaunchResultById(id);
    if (!result) return json({ error: "Result not ready" }, 404);
    return json(result);
  }

  if (url.pathname === "/api/case/ask" && request.method === "POST") {
    let body: { caseId?: string; question?: string };
    try {
      body = await request.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }
    const parsed = z
      .object({
        caseId: z.string().uuid(),
        question: z.string().min(3).max(500),
      })
      .safeParse(body);
    if (!parsed.success) {
      return json({ error: parsed.error.flatten().fieldErrors }, 400);
    }

    try {
      const [
        { getCaseResultById },
        { answerFollowUp },
        { getCaseSituation, getMemoryCaseInput },
      ] = await Promise.all([
        import("@/lib/api/case-handlers.server"),
        import("@/lib/swarm/lab-insights.server"),
        import("@/lib/swarm/orchestrator.server"),
      ]);
      const result = await getCaseResultById(parsed.data.caseId);
      if (!result?.lab) return json({ error: "Lab data not ready" }, 404);

      const situation =
        (await getCaseSituation(parsed.data.caseId)) ??
        getMemoryCaseInput(parsed.data.caseId)?.situation ??
        result.lab.situationSummary;

      return json({
        answer: answerFollowUp(
          parsed.data.question,
          situation,
          {
            parties: [],
            jurisdiction: result.jurisdiction,
            disputeType: result.disputeType,
            legalDomain: "",
            keyFacts: [],
            timeline: [],
            claims: [],
            summary: situation,
          },
          {
            winProbability: result.winProbability,
            confidence: result.confidence,
            estimatedCost: result.estimatedCost,
            estimatedTimeline: result.estimatedTimeline,
            strengths: result.strengths,
            risks: result.risks,
            reasoning: result.lab.liabilityReasoning,
          },
          {
            recommendation: result.recommendation,
            rationale: result.strategy.rationale,
            alternatives: result.strategy.alternatives,
          },
          result.lab,
        ),
      });
    } catch (e) {
      return json({ error: e instanceof Error ? e.message : "Lab question failed" }, 500);
    }
  }

  return null;
}
