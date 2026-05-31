import {
  buildStructuredCase,
  classifyCase,
  domainFromStructured,
  memosForDomain,
  precedentsForDomain,
  riskForDomain,
  statutesForDomain,
  strategyForDomain,
} from "./case-knowledge.server";
import { daytonaComputeRiskScore } from "./sponsors/daytona.server";
import type { AgentRunner, RiskAssessment } from "./types";

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

function getDomain(ctx: Parameters<AgentRunner>[0]) {
  const classified = classifyCase(ctx.input.situation, ctx.input.caseType);
  return classified.domain;
}

/** Fully offline agents — outputs match the user's actual fact pattern */
export const demoIntakeAgent: AgentRunner = async (ctx, onLine) => {
  await onLine("Parsing free-text input (demo mode)…");
  await wait(400);

  const classified = classifyCase(ctx.input.situation, ctx.input.caseType);
  const structured = buildStructuredCase(
    ctx.input.situation,
    ctx.input.jurisdiction,
    ctx.input.caseType,
  );

  await onLine(`Identified parties: you (plaintiff), ${classified.defendantLabel}`);
  await onLine(`Jurisdiction: ${structured.jurisdiction}`);
  await onLine(`Dispute class: ${structured.disputeType}`);
  await onLine(`Key facts extracted: ${structured.keyFacts.length}`);
  await onLine(`Claims identified: ${structured.claims.join("; ").slice(0, 80)}…`);

  return { case: structured };
};

export const demoResearchAgent: AgentRunner = async (ctx, onLine) => {
  const c = ctx.case!;
  const domain = domainFromStructured(c, ctx.input.situation, ctx.input.caseType);

  await onLine(`Researching ${c.disputeType} statutes in ${c.jurisdiction}…`);
  await wait(400);

  const statutes = statutesForDomain(domain, c.jurisdiction);
  for (const s of statutes) {
    await onLine(`Retrieved ${s.cite}`);
    await wait(180);
  }
  await onLine(`Compiled ${statutes.length} statutes relevant to this case type`);

  return { research: statutes };
};

export const demoPrecedentAgent: AgentRunner = async (ctx, onLine) => {
  const domain = getDomain(ctx);
  await onLine(`Searching ${ctx.case?.disputeType ?? "case"} precedents…`);
  await wait(400);

  const precedents = precedentsForDomain(domain, ctx.case?.jurisdiction ?? ctx.input.jurisdiction);

  for (const p of precedents) {
    const amt = p.amount ? `, ${p.amount}` : "";
    await onLine(`${p.name} (${p.year}) — ${p.outcome}${amt}`);
    await wait(220);
  }

  const favorable = precedents.filter(
    (p) =>
      p.outcome.toLowerCase().includes("plaintiff") ||
      p.outcome.toLowerCase().includes("settled"),
  ).length;
  const pct = precedents.length
    ? Math.round((favorable / precedents.length) * 100)
    : 50;
  await onLine(`Outcome distribution: ${pct}% plaintiff-favorable in analogous cases`);

  return { precedents };
};

export const demoRiskAgent: AgentRunner = async (ctx, onLine) => {
  const domain = getDomain(ctx);
  const structured = ctx.case!;

  await onLine("Weighing liability and damages against fact pattern…");
  await wait(400);

  const draft = riskForDomain(domain, ctx.input.situation, structured);

  const favorable = (ctx.precedents ?? []).filter(
    (p) =>
      p.outcome.toLowerCase().includes("plaintiff") ||
      p.outcome.toLowerCase().includes("settled"),
  ).length;

  const daytonaScore = await daytonaComputeRiskScore(
    favorable,
    ctx.precedents?.length ?? 3,
    draft.strengths.length,
    draft.risks.length,
    onLine,
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

  await onLine(
    `Win probability: ${risk.winProbability}% (confidence band ±${risk.confidence}%)`,
  );
  await onLine(`Estimated cost to litigate: ${risk.estimatedCost}`);
  await onLine(`Estimated timeline: ${risk.estimatedTimeline}`);
  await onLine(`Top risk: ${risk.risks[0]}`);

  return { risk };
};

export const demoStrategyAgent: AgentRunner = async (ctx, onLine) => {
  const domain = getDomain(ctx);
  await onLine("Modeling strategic paths for this case type…");
  await wait(400);

  const win = ctx.risk?.winProbability ?? 55;
  const strategy = strategyForDomain(domain, win, ctx.input.situation);

  await onLine(`Recommendation: ${strategy.recommendation.toUpperCase()}`);
  await onLine(`Rationale: ${strategy.rationale.slice(0, 120)}…`);
  for (const alt of strategy.alternatives) {
    await onLine(`Alt: ${alt.name}`);
  }

  return { strategy };
};

export const demoOutputAgent: AgentRunner = async (ctx, onLine) => {
  const domain = getDomain(ctx);
  await onLine("Drafting lawyer-mode memo with case-specific citations…");
  await wait(500);
  await onLine("Drafting plain-English client summary…");
  await wait(400);

  const memos = memosForDomain(domain, {
    structured: ctx.case!,
    risk: ctx.risk!,
    strategy: ctx.strategy!,
    statutes: ctx.research ?? [],
    precedents: ctx.precedents ?? [],
    situation: ctx.input.situation,
  });

  await onLine("Memos tailored to your fact pattern");
  await onLine("Verdict ready.");

  return { memos };
};
