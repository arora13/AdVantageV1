import type { CaseResult } from "@/lib/verdict-data";

import {
  buildStructuredCase,
  domainFromStructured,
  memosForDomain,
  precedentsForDomain,
  riskForDomain,
  statutesForDomain,
  strategyForDomain,
} from "./case-knowledge.server";
import { buildActionPack } from "./action-pack.server";
import { buildLabInsights } from "./lab-insights.server";
import { daytonaComputeRiskScore } from "./sponsors/daytona.server";
import type { CaseInput, RiskAssessment } from "./types";

/** Instant lab result — no agent delays, for exploratory use like ML Labs */
export async function buildQuickLabResult(input: CaseInput): Promise<CaseResult> {
  const structured = buildStructuredCase(
    input.situation,
    input.jurisdiction,
    input.caseType,
  );
  const domain = domainFromStructured(structured, input.situation, input.caseType);
  const statutes = statutesForDomain(domain, structured.jurisdiction);
  const precedents = precedentsForDomain(domain, structured.jurisdiction);
  const draft = riskForDomain(domain, input.situation, structured);

  const favorable = precedents.filter(
    (p) =>
      p.outcome.toLowerCase().includes("plaintiff") ||
      p.outcome.toLowerCase().includes("settled"),
  ).length;

  const daytonaScore = await daytonaComputeRiskScore(
    favorable,
    precedents.length,
    draft.strengths.length,
    draft.risks.length,
    async () => {},
  );

  const risk: RiskAssessment = {
    winProbability: daytonaScore?.score ?? draft.baseWin,
    confidence: daytonaScore?.confidence ?? draft.confidence,
    estimatedCost: draft.estimatedCost,
    estimatedTimeline: draft.estimatedTimeline,
    strengths: draft.strengths,
    risks: draft.risks,
    reasoning: draft.reasoning,
  };

  const strategy = strategyForDomain(domain, risk.winProbability, input.situation);
  const memos = memosForDomain(domain, {
    structured,
    risk,
    strategy,
    statutes,
    precedents,
    situation: input.situation,
  });
  const lab = buildLabInsights(
    input.situation,
    structured,
    risk,
    strategy,
    input.caseType,
  );
  const actions = buildActionPack(
    input.situation,
    structured,
    risk,
    strategy,
    lab,
    input.caseType,
  );

  return {
    winProbability: risk.winProbability,
    confidence: risk.confidence,
    recommendation: strategy.recommendation,
    estimatedCost: risk.estimatedCost,
    estimatedTimeline: risk.estimatedTimeline,
    jurisdiction: structured.jurisdiction,
    disputeType: structured.disputeType,
    strengths: risk.strengths,
    risks: risk.risks,
    statutes,
    precedents: precedents.map(({ whyRelevant: _, ...p }) => p),
    strategy: {
      primary: strategy.recommendation,
      rationale: strategy.rationale,
      alternatives: strategy.alternatives,
    },
    memo: memos,
    lab,
    actions,
  };
}
