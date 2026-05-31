import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import type { CaseInput } from "@/lib/swarm/types";
import type { CaseResult } from "@/lib/verdict-data";

const caseInputSchema = z.object({
  situation: z.string().min(20),
  jurisdiction: z.string().min(1),
  mode: z.enum(["client", "lawyer"]),
  caseType: z.string().optional(),
  kind: z.enum(["dispute", "contract"]).optional(),
  fileName: z.string().nullable().optional(),
  fileContent: z.string().nullable().optional(),
});

export const startCaseAnalysis = createServerFn({ method: "POST" })
  .inputValidator(caseInputSchema)
  .handler(async ({ data }): Promise<{ caseId: string; result?: CaseResult }> => {
    const { startCase } = await import("@/lib/api/case-handlers.server");
    return startCase(data as CaseInput);
  });

export const pollCaseProgress = createServerFn({ method: "POST" })
  .inputValidator(z.object({ caseId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { getMemoryProgress } = await import("@/lib/swarm/orchestrator.server");
    const progress = getMemoryProgress(data.caseId);
    if (!progress) throw new Error("Case not found");
    return progress;
  });

export const fetchCaseResult = createServerFn({ method: "POST" })
  .inputValidator(z.object({ caseId: z.string().uuid() }))
  .handler(async ({ data }): Promise<CaseResult> => {
    const { getCaseResultById } = await import("@/lib/api/case-handlers.server");
    const result = await getCaseResultById(data.caseId);
    if (!result) throw new Error("Result not ready");
    return result;
  });

export const quickExploreSituation = createServerFn({ method: "POST" })
  .inputValidator(caseInputSchema)
  .handler(async ({ data }): Promise<{ caseId: string; result: CaseResult }> => {
    const { quickExploreCase } = await import("@/lib/api/case-handlers.server");
    return quickExploreCase(data as CaseInput);
  });

export const askSituationLab = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      caseId: z.string().uuid(),
      question: z.string().min(3).max(500),
    }),
  )
  .handler(async ({ data }): Promise<{ answer: string }> => {
    const [
      { getCaseResultById },
      { answerFollowUp },
      { getCaseSituation, getMemoryCaseInput },
    ] = await Promise.all([
      import("@/lib/api/case-handlers.server"),
      import("@/lib/swarm/lab-insights.server"),
      import("@/lib/swarm/orchestrator.server"),
    ]);
    const result = await getCaseResultById(data.caseId);

    if (!result?.lab) throw new Error("Lab data not ready");

    const situation =
      (await getCaseSituation(data.caseId)) ??
      getMemoryCaseInput(data.caseId)?.situation ??
      result.lab.situationSummary;

    const answer = answerFollowUp(
      data.question,
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
    );

    return { answer };
  });

export const getBackendStatus = createServerFn({ method: "GET" }).handler(async () => {
  const { getIntegrationsStatus } = await import("@/lib/gtm/sponsor-config.server");
  return getIntegrationsStatus();
});
