import type { LaunchLead } from "@/lib/launch-data";
import { profileProduct, type EnrichedProfile } from "./product-knowledge.server";
import type { GtmContext, LaunchInput } from "./types";

export function formatLaunchBrief(ctx: GtmContext): string {
  const { input } = ctx;
  const lines = [
    `User description:\n${input.productDescription}`,
    `Launch goal: ${input.launchGoal ?? "waitlist"}`,
    `Product name hint: ${input.productName ?? "(extract from description)"}`,
    `Repository: ${input.repoUrl ?? "none"}`,
  ];

  if (ctx.profile) {
    const p = ctx.profile;
    lines.push(
      "",
      "Positioning (from CMO):",
      `- Product: ${p.productName}`,
      `- Tagline: ${p.tagline}`,
      `- Category: ${p.category}`,
      `- ICP: ${p.icp}`,
      `- Core pain: ${p.painPoint}`,
      `- Channels: ${p.channels.join(", ")}`,
    );
    if ("launchAngle" in p) {
      lines.push(`- Launch angle: ${(p as EnrichedProfile).launchAngle}`);
    }
  }

  if (ctx.strategy?.rationale) {
    lines.push("", `Strategy rationale: ${ctx.strategy.rationale}`);
  }

  if (ctx.strategy?.timeline?.length) {
    lines.push(
      "",
      "30-day timeline (summary):",
      ...ctx.strategy.timeline.slice(0, 5).map((t) => `  Day ${t.day} · ${t.channel}: ${t.action}`),
    );
  }

  if (ctx.leads?.length) {
    lines.push("", "Target contacts (for content personalization):");
    for (const l of ctx.leads.slice(0, 6)) {
      lines.push(`  - ${l.name} (${l.platform}): ${l.painSnippet}`);
    }
  }

  return lines.join("\n");
}

export function baselineProfile(input: LaunchInput): EnrichedProfile {
  return profileProduct(input);
}

export function summarizeLeadsForPrompt(leads: LaunchLead[]): string {
  return leads
    .slice(0, 8)
    .map((l, i) => `${i + 1}. ${l.name} | ${l.platform} | pain: ${l.painSnippet} | hook: ${l.hook}`)
    .join("\n");
}
