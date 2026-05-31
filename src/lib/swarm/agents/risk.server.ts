import { domainFromStructured, riskForDomain } from "../case-knowledge.server";
import { chatJson } from "../llm.server";
import { daytonaComputeRiskScore } from "../sponsors/daytona.server";
import type { AgentRunner, RiskAssessment } from "../types";

export const runRiskAgent: AgentRunner = async (ctx, onLine) => {
  await onLine("Weighing precedent outcomes against fact strength…");

  const precedents = ctx.precedents ?? [];
  const favorable = precedents.filter(
    (p) =>
      p.outcome.toLowerCase().includes("plaintiff") ||
      p.outcome.toLowerCase().includes("settled"),
  ).length;

  const draft = await chatJson<RiskAssessment>(
    `You are the Risk Agent. Assess THIS case type (match disputeType — PI auto accident vs employment etc.). Calculate win probability, confidence, cost, timeline, strengths, risks. Return JSON.`,
    `Case: ${JSON.stringify(ctx.case)}
Precedents: ${JSON.stringify(precedents)}
Statutes: ${JSON.stringify(ctx.research)}`,
    onLine,
  );

  const daytonaScore = await daytonaComputeRiskScore(
    favorable,
    precedents.length,
    draft.strengths?.length ?? 2,
    draft.risks?.length ?? 2,
    onLine,
  );

  const risk: RiskAssessment = {
    ...draft,
    winProbability: daytonaScore?.score ?? draft.winProbability ?? 55,
    confidence: daytonaScore?.confidence ?? draft.confidence ?? 10,
  };

  await onLine(
    `Win probability: ${risk.winProbability}% (confidence band ±${risk.confidence}%)`,
  );
  await onLine(`Estimated cost to litigate: ${risk.estimatedCost}`);
  await onLine(`Estimated timeline: ${risk.estimatedTimeline}`);
  if (risk.risks?.[0]) await onLine(`Top risk: ${risk.risks[0]}`);

  return { risk };
};

export const riskFallback: AgentRunner = async (ctx, onLine) => {
  const c = ctx.case!;
  const domain = domainFromStructured(c, ctx.input.situation, ctx.input.caseType);
  await onLine("Risk fallback: case-type-specific estimate");
  const draft = riskForDomain(domain, ctx.input.situation, c);
  return {
    risk: {
      winProbability: draft.baseWin,
      confidence: draft.confidence,
      estimatedCost: draft.estimatedCost,
      estimatedTimeline: draft.estimatedTimeline,
      strengths: draft.strengths,
      risks: draft.risks,
      reasoning: draft.reasoning,
    },
  };
};
