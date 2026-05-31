import {
  classifyCase,
  domainFromStructured,
  memosForDomain,
  precedentsForDomain,
  riskForDomain,
  statutesForDomain,
  strategyForDomain,
} from "../case-knowledge.server";
import { chatJson } from "../llm.server";
import { apifyResearchStatutes } from "../sponsors/apify.server";
import { rtrvrResearchFallback } from "../sponsors/rtrvr.server";
import type { AgentRunner, StatuteEntry } from "../types";

export const runResearchAgent: AgentRunner = async (ctx, onLine) => {
  const c = ctx.case!;
  await onLine(`Researching statutes for ${c.jurisdiction}…`);

  const apifyResults = await apifyResearchStatutes(
    c.jurisdiction,
    c.disputeType,
    c.keyFacts ?? [],
    onLine,
  );

  let supplemental: StatuteEntry[] = [];
  if (apifyResults.length < 2) {
    supplemental = await rtrvrResearchFallback(
      `${c.disputeType} ${c.jurisdiction} relevant statutes regulations`,
      onLine,
    );
  }

  const webContext = [...apifyResults, ...supplemental]
    .map((s) => `- ${s.cite}: ${s.summary}`)
    .join("\n");

  const aiStatutes = await chatJson<{ statutes: StatuteEntry[] }>(
    `You are the Research Agent. List laws and statutes that match THIS case type (e.g. DUI/vehicle code for car accidents, NOT employment law unless the case is employment). Return JSON: { statutes: [{ cite, summary, source }] }`,
    `Case summary: ${c.summary}
Jurisdiction: ${c.jurisdiction}
Dispute: ${c.disputeType}
Claims: ${(c.claims ?? []).join("; ")}

Web scrape results (may be empty):
${webContext || "None — use your legal knowledge for this jurisdiction."}`,
    onLine,
  );

  const merged = aiStatutes.statutes ?? [];
  for (const s of merged) {
    await onLine(`Retrieved ${s.cite}`);
  }
  await onLine(`Compiled ${merged.length} statutes and regulatory citations`);

  return { research: merged };
};

export const researchFallback: AgentRunner = async (ctx, onLine) => {
  const c = ctx.case!;
  const domain = domainFromStructured(c, ctx.input.situation, ctx.input.caseType);
  await onLine(`Research fallback: ${c.disputeType} statutes`);
  return { research: statutesForDomain(domain, c.jurisdiction) };
};
