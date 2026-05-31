import { classifyCase, memosForDomain } from "../case-knowledge.server";
import { chatText } from "../llm.server";
import type { AgentRunner, OutputMemos } from "../types";

export const runOutputAgent: AgentRunner = async (ctx, onLine) => {
  await onLine("Drafting lawyer-mode memo with citations…");

  const context = `
Case: ${JSON.stringify(ctx.case)}
Statutes: ${JSON.stringify(ctx.research)}
Precedents: ${JSON.stringify(ctx.precedents)}
Risk: ${JSON.stringify(ctx.risk)}
Strategy: ${JSON.stringify(ctx.strategy)}`;

  const lawyer = await chatText(
    `You are the Output Agent. Write a formal legal memorandum matching the case type in the facts (PI memo for car accidents, employment memo for termination, etc.). Sections: STATEMENT OF FACTS, APPLICABLE LAW, ANALYSIS, RECOMMENDATION. Do NOT discuss employment law if this is a personal injury case.`,
    context,
  );
  await onLine("Drafting plain-English client summary…");

  const client = await chatText(
    `You are the Output Agent. Plain-English summary matching the case type (drunk driver = personal injury, not employment). Include win chances, recommendation, strengths, risks, next steps.`,
    context,
  );

  await onLine("Memos staged in session");
  await onLine("Verdict ready.");

  return { memos: { lawyer, client } };
};

export const outputFallback: AgentRunner = async (ctx, onLine) => {
  const domain = classifyCase(ctx.input.situation, ctx.input.caseType).domain;
  await onLine("Output fallback: case-specific memo");
  if (!ctx.case || !ctx.risk || !ctx.strategy) {
    return {
      memos: {
        lawyer: ctx.case?.summary ?? ctx.input.situation,
        client: `We analyzed your situation. Open the Action Pack for demand letters and your execution timeline.`,
      },
    };
  }
  return {
    memos: memosForDomain(domain, {
      structured: ctx.case,
      risk: ctx.risk,
      strategy: ctx.strategy,
      statutes: ctx.research ?? [],
      precedents: ctx.precedents ?? [],
      situation: ctx.input.situation,
    }),
  };
};
