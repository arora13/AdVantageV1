import type { LaunchAsset, LaunchContent, LaunchLead } from "@/lib/launch-data";
import { hasAiBackend } from "@/lib/ai-config.server";
import { chatJson } from "@/lib/swarm/llm.server";
import { baselineProfile, formatLaunchBrief } from "./ai-context.server";
import {
  MAX_LEADS,
  contentFor,
  ensureEnrichedProfile,
  leadsFor,
  mergeContent,
  mergeLeads,
  strategyFor,
  type EnrichedProfile,
} from "./product-knowledge.server";
import type { GtmContext, StrategyOutput } from "./types";
import type { LeadSignal } from "./sponsors/apify-leads.server";

const PLATFORMS = [
  "twitter",
  "reddit",
  "linkedin",
  "hackernews",
  "instagram",
  "google",
  "nextdoor",
  "facebook",
  "email",
  "local",
] as const;

const QUALITY_RULES = `
Quality rules (strict):
- Ground every output in the user's description — reuse their location, season, niche, audience, and product name.
- Never give generic SaaS advice (Show HN, r/SaaS) unless the user is clearly building software.
- No fake named people. If you do not have a live web signal for a named person, use a business, organization, role, community, or search target instead.
- Be specific, actionable, and ready to copy-paste.
- Prefer real community names, local press, trade partners, or subreddits over vague "influencers".
`;

function normalizePlatform(p: string): LaunchLead["platform"] {
  const lower = p.toLowerCase();
  return PLATFORMS.includes(lower as (typeof PLATFORMS)[number])
    ? (lower as LaunchLead["platform"])
    : "local";
}

function removeInventedPersonName(name: string, profile: GtmContext["profile"], hasLiveSignals: boolean): string {
  if (hasLiveSignals || !profile) return name;
  const isLocal = /local|cafe|restaurant|coffee|retail|service|dealership|builder|construction/i.test(
    profile.category,
  );
  if (!isLocal) return name;

  const personPrefix = name.match(/^([A-Z][a-z]+ [A-Z][a-z]+)\s*(?:[-—:]\s*)?(.*)$/);
  if (!personPrefix) return name;

  const remainder = personPrefix[2]?.trim();
  if (remainder && /manager|owner|coordinator|editor|broker|contractor|foreman|superintendent|lead/i.test(remainder)) {
    return remainder;
  }

  return `Role search: ${profile.category} partner`;
}

type CmoAiResponse = {
  productName?: string;
  tagline?: string;
  icp?: string;
  summary?: string;
  strategyTimeline?: { day: number; channel: string; action: string }[];
};

type HunterAiResponse = {
  leads?: {
    name: string;
    platform: string;
    handle: string;
    url: string;
    painSnippet: string;
    hook: string;
  }[];
};

type ContentAiResponse = {
  content?: { id: string; platform: string; title: string; body: string }[];
};

type BuilderAiResponse = {
  assets?: { id: string; title: string; kind: "landing" | "email"; code: string }[];
};

export async function aiCmoStrategy(
  ctx: GtmContext,
  onLine?: (line: string) => Promise<void>,
): Promise<{ profile: EnrichedProfile; strategy: StrategyOutput } | null> {
  if (!hasAiBackend()) return null;

  const baseline = baselineProfile(ctx.input);
  await onLine?.("CMO: Claude analyzing positioning and 30-day plan…");

  const system = `You are the CMO Agent in AdVantage — an expert GTM strategist.
${QUALITY_RULES}

Output JSON only:
{
  "productName": string,
  "tagline": string,
  "icp": string,
  "summary": string (2-3 sentences tying strategy to the user's pitch),
  "strategyTimeline": [{ "day": number, "channel": string, "action": string }]
}

Requirements:
- strategyTimeline: 6-8 steps across 30 days, channels appropriate for THIS business.
- Match business type: ${baseline.kind} / ${baseline.category}.`;

  try {
    const raw = await chatJson<CmoAiResponse>(
      system,
      formatLaunchBrief({ input: ctx.input }),
      onLine,
      4096,
    );

    const profile: EnrichedProfile = {
      ...baseline,
      productName: raw.productName?.trim() || baseline.productName,
      tagline: raw.tagline?.trim() || baseline.tagline,
      icp: raw.icp?.trim() || baseline.icp,
    };

    let timeline = (raw.strategyTimeline ?? []).slice(0, 10).filter((t) => t.action?.trim());
    if (timeline.length < 4) {
      const fallback = strategyFor(baseline, ctx.input.launchGoal ?? "waitlist");
      timeline = [...timeline, ...fallback.timeline].slice(0, 8);
      await onLine?.("CMO: padded strategy with domain template steps");
    }

    await onLine?.(`CMO: ${timeline.length}-step playbook tailored to ${profile.category}`);

    return {
      profile,
      strategy: {
        timeline,
        rationale: raw.summary?.trim() || baseline.launchAngle,
      },
    };
  } catch (err) {
    await onLine?.(`CMO AI failed (${err instanceof Error ? err.message : "error"})`);
    return null;
  }
}

export async function aiHunterLeads(
  ctx: GtmContext,
  webSignals: LeadSignal[],
  onLine?: (line: string) => Promise<void>,
): Promise<LaunchLead[] | null> {
  if (!hasAiBackend()) return null;

  const profile = ensureEnrichedProfile(ctx.input, ctx.profile as EnrichedProfile | undefined);

  await onLine?.("Lead Hunter: Claude finding high-intent contacts…");

  const signalBlock =
    webSignals.length > 0
      ? `\n\nLive web signals (merge the best into your list, cite real URLs when possible):\n${webSignals
          .slice(0, 12)
          .map((s) => `- [${s.platform}] ${s.title}: ${s.snippet} (${s.url})`)
          .join("\n")}`
      : "";

  const system = `You are the Lead Hunter Agent in AdVantage.
${QUALITY_RULES}

Find exactly ${MAX_LEADS} high-intent contacts to reach for THIS launch — partners, communities, press, buyers, customer clusters, competitor-adjacent businesses, or organizers (not random consumers).

For local businesses:
- infer the city/area from the pitch if provided; if missing, make each URL a reusable Google/Maps search query with "near me" or "near [area]".
- include discovery targets like "Google Maps search: cafes near [area]", "nearby office managers", "local chamber", "construction permit desk", "trade association chapter", "Nextdoor neighborhood", and competitor/adjacent businesses whose customers overlap.
- do NOT invent individual names. Use roles like "owner/manager", "site superintendent", "community manager", or "chapter events coordinator" unless live web signals supplied a real name.
- the hook should tell the user exactly how to use the target: what to search, who to ask for, and the first message/offer.

Output JSON:
{
  "leads": [{
    "name": string (person, publication, community, or business),
    "platform": string (twitter|reddit|linkedin|hackernews|instagram|google|nextdoor|facebook|email|local),
    "handle": string,
    "url": string (realistic URL or search link),
    "painSnippet": string (why they care, in their words),
    "hook": string (personalized outreach opener referencing their pain)
  }]
}`;

  try {
    const raw = await chatJson<HunterAiResponse>(
      system,
      formatLaunchBrief({ ...ctx, profile }) + signalBlock,
      onLine,
      5000,
    );

    const leads = (raw.leads ?? [])
      .slice(0, MAX_LEADS)
      .map((l, i) => ({
        name: removeInventedPersonName(
          l.name?.trim() || `Contact ${i + 1}`,
          profile,
          webSignals.length > 0,
        ),
        platform: normalizePlatform(l.platform ?? "local"),
        handle: l.handle?.trim() || "—",
        url: l.url?.trim() || "https://google.com/search?q=local+partners",
        painSnippet: l.painSnippet?.trim() || "",
        hook: l.hook?.trim() || "",
      }))
      .filter((l) => l.painSnippet.length > 12 && l.hook.length > 10);

    const templateLeads = leadsFor(profile, ctx.input.productDescription);
    const merged = mergeLeads(leads, templateLeads);

    await onLine?.(`Lead Hunter: ${merged.length} contacts (${leads.length} from AI, merged with domain templates)`);
    return merged;
  } catch (err) {
    await onLine?.(`Lead Hunter AI failed (${err instanceof Error ? err.message : "error"})`);
    return null;
  }
}

export async function aiContentDrafts(
  ctx: GtmContext,
  onLine?: (line: string) => Promise<void>,
): Promise<LaunchContent[] | null> {
  if (!hasAiBackend()) return null;

  const profile = ensureEnrichedProfile(ctx.input, ctx.profile as EnrichedProfile | undefined);

  await onLine?.("Content Engine: Claude drafting channel-native copy…");

  const system = `You are the Content Engine Agent in AdVantage.
${QUALITY_RULES}

Write 4-6 marketing post drafts for their dashboard. Include at least 2 Instagram posts (caption-ready) when the business is local (retail, auto, food, services). Other channels: Nextdoor, Google Business, Facebook, email, X, Reddit, HN as appropriate. Never recommend channels that don't fit (e.g. Show HN for a used car lot).

Output JSON:
{
  "content": [{
    "id": string (slug, e.g. "ig-opening"),
    "platform": string,
    "title": string,
    "body": string (full post/email — use \\n for line breaks)
  }]
}

Each draft must reference specific details from the user's pitch or lead pain points.`;

  try {
    const raw = await chatJson<ContentAiResponse>(
      system,
      formatLaunchBrief({ ...ctx, profile }),
      onLine,
      6000,
    );

    const content: LaunchContent[] = (raw.content ?? [])
      .filter((c) => c.body?.trim() && c.title?.trim())
      .map((c) => ({
        id: c.id || `draft-${c.platform}`,
        platform: c.platform,
        title: c.title,
        body: c.body.trim(),
        status: "draft" as const,
      }));

    const templateContent = contentFor(profile, ctx.input);
    const merged = mergeContent(content, templateContent);

    await onLine?.(`Content Engine: ${merged.length} drafts ready (${merged.map((c) => c.platform).join(", ")})`);
    return merged;
  } catch (err) {
    await onLine?.(`Content Engine AI failed (${err instanceof Error ? err.message : "error"})`);
    return null;
  }
}

export async function aiBuilderAssets(
  ctx: GtmContext,
  onLine?: (line: string) => Promise<void>,
): Promise<LaunchAsset[] | null> {
  if (!hasAiBackend() || !ctx.profile) return null;

  const goal = ctx.input.launchGoal ?? "waitlist";
  await onLine?.("Asset Builder: Claude generating landing page + email HTML…");

  const system = `You are the Asset Builder Agent in AdVantage.
${QUALITY_RULES}

Generate production-ready assets for: ${ctx.profile.productName} — ${ctx.profile.tagline}

Output JSON:
{
  "assets": [
    {
      "id": string,
      "title": string,
      "kind": "landing" | "email",
      "code": string
    }
  ]
}

Requirements:
- Exactly 2 assets: one React/Tailwind landing page (export default function), one HTML email template.
- Use real copy from the profile (product name, tagline, pain, CTA for ${goal}).
- Landing: Tailwind classes, mobile-friendly, emerald accent on zinc-950 background.
- Email: inline styles, {{first_name}} and {{waitlist_url}} placeholders allowed.
- No markdown fences inside code strings.`;

  try {
    const raw = await chatJson<BuilderAiResponse>(
      system,
      formatLaunchBrief(ctx),
      onLine,
      8192,
    );

    const assets: LaunchAsset[] = (raw.assets ?? [])
      .filter((a) => a.code?.trim() && a.kind && a.title)
      .slice(0, 2)
      .map((a) => ({
        id: a.id || a.kind,
        title: a.title,
        kind: a.kind,
        code: a.code.trim(),
        buildStatus: "pending" as const,
      }));

    if (assets.length < 2) {
      await onLine?.("Asset Builder: incomplete assets");
      return null;
    }

    await onLine?.(`Asset Builder: ${assets.map((a) => a.title).join(" + ")} generated`);
    return assets;
  } catch (err) {
    await onLine?.(`Asset Builder AI failed (${err instanceof Error ? err.message : "error"})`);
    return null;
  }
}
