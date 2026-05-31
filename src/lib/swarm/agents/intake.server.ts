import { buildStructuredCase, classifyCase } from "../case-knowledge.server";
import { chatJson } from "../llm.server";
import { daytonaParseDocument } from "../sponsors/daytona.server";
import type { AgentRunner, StructuredCase } from "../types";

const INTAKE_SYSTEM = `You are the Intake Agent in a legal analysis swarm. Parse the user's ACTUAL situation — do not assume employment law unless the facts support it.

Examples:
- "hit by drunk driver" → Personal Injury / motor vehicle / DUI negligence
- "landlord won't return deposit" → Landlord-tenant
- "fired after complaining" → Employment retaliation

Return JSON: { parties: [{role, name}], jurisdiction, disputeType, legalDomain, keyFacts: string[], timeline: [{date, event}], claims: string[], summary }`;

export const runIntakeAgent: AgentRunner = async (ctx, onLine) => {
  await onLine("Parsing free-text input…");

  let situation = ctx.input.situation;
  if (ctx.input.fileContent && ctx.input.fileName) {
    const parsed = await daytonaParseDocument(
      ctx.input.fileName,
      ctx.input.fileContent,
      onLine,
    );
    situation = `${situation}\n\n--- Document (${ctx.input.fileName}) ---\n${parsed}`;
  }

  const result = await chatJson<StructuredCase>(
    INTAKE_SYSTEM,
    `Jurisdiction hint: ${ctx.input.jurisdiction}
Case type hint: ${ctx.input.caseType ?? "unknown"}
Mode: ${ctx.input.mode}

User input:
${situation}`,
    onLine,
  );

  await onLine(`Identified ${result.parties?.length ?? 0} parties`);
  await onLine(`Dispute class: ${result.disputeType ?? result.legalDomain}`);
  await onLine(`Key facts extracted: ${result.keyFacts?.length ?? 0}`);
  await onLine(`Timeline events: ${result.timeline?.length ?? 0}`);

  return { case: { ...result, jurisdiction: result.jurisdiction || ctx.input.jurisdiction } };
};

export const intakeFallback: AgentRunner = async (ctx, onLine) => {
  const classified = classifyCase(ctx.input.situation, ctx.input.caseType);
  await onLine(`Intake fallback: classified as ${classified.disputeType}`);
  return {
    case: buildStructuredCase(
      ctx.input.situation,
      ctx.input.jurisdiction,
      ctx.input.caseType,
    ),
  };
};
