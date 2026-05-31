import { domainFromStructured, precedentsForDomain } from "../case-knowledge.server";
import { chatJson } from "../llm.server";
import type { AgentRunner, PrecedentEntry } from "../types";

export const runPrecedentAgent: AgentRunner = async (ctx, onLine) => {
  await onLine("Searching analogous fact patterns…");

  const result = await chatJson<{ precedents: PrecedentEntry[] }>(
    `You are the Precedent Agent. Find 3-5 analogous cases for THIS dispute type and jurisdiction (e.g. motor vehicle DUI cases for drunk driving — NOT employment cases). Return JSON: { precedents: [{ name, year, outcome, amount?, summary, whyRelevant }] }`,
    `Case: ${JSON.stringify(ctx.case)}
Statutes: ${JSON.stringify(ctx.research?.map((s) => s.cite))}`,
    onLine,
  );

  const precedents = result.precedents ?? [];
  for (const p of precedents) {
    const amt = p.amount ? `, ${p.amount}` : "";
    await onLine(`${p.name} (${p.year}) — ${p.outcome}${amt}`);
  }

  const favorable = precedents.filter(
    (p) =>
      p.outcome.toLowerCase().includes("plaintiff") ||
      p.outcome.toLowerCase().includes("settled"),
  ).length;
  if (precedents.length) {
    await onLine(
      `Outcome distribution: ${Math.round((favorable / precedents.length) * 100)}% plaintiff-favorable`,
    );
  }

  return { precedents };
};

export const precedentFallback: AgentRunner = async (ctx, onLine) => {
  const c = ctx.case!;
  const domain = domainFromStructured(c, ctx.input.situation, ctx.input.caseType);
  await onLine(`Precedent fallback: ${c.disputeType} cases`);
  return { precedents: precedentsForDomain(domain, c.jurisdiction) };
};
