import { classifyCase, strategyForDomain } from "../case-knowledge.server";
import { chatJson } from "../llm.server";
import type { AgentRunner, StrategyOutput } from "../types";

export const runStrategyAgent: AgentRunner = async (ctx, onLine) => {
  await onLine("Modeling EV across 5 strategic paths…");

  const strategy = await chatJson<StrategyOutput>(
    `You are the Strategy Agent. Recommend action appropriate for THIS case type (Sue is common for serious PI; Send Demand Letter for clear-liability insurance claims; NOT employment tactics for car accidents). Return JSON: { recommendation, rationale, alternatives: [{ name, tradeoff }] }`,
    `Case: ${JSON.stringify(ctx.case)}
Risk: ${JSON.stringify(ctx.risk)}
Precedents: ${JSON.stringify(ctx.precedents?.map((p) => ({ name: p.name, outcome: p.outcome })))}`,
    onLine,
  );

  await onLine(`Recommendation: ${strategy.recommendation.toUpperCase()}`);
  await onLine(`Rationale: ${strategy.rationale.slice(0, 120)}…`);
  for (const alt of strategy.alternatives ?? []) {
    await onLine(`Alt: ${alt.name}`);
  }

  return { strategy };
};

export const strategyFallback: AgentRunner = async (ctx, onLine) => {
  const domain = classifyCase(ctx.input.situation, ctx.input.caseType).domain;
  const win = ctx.risk?.winProbability ?? 55;
  await onLine(`Strategy fallback: ${domain.replace(/_/g, " ")}`);
  return { strategy: strategyForDomain(domain, win, ctx.input.situation) };
};
