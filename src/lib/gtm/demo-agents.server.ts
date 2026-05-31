import { hasAiBackend } from "@/lib/ai-config.server";
import {
  aiBuilderAssets,
  aiCmoStrategy,
  aiContentDrafts,
  aiHunterLeads,
} from "./ai-agents.server";
import { apifyHuntLeads } from "./sponsors/apify-leads.server";
import { daytonaVerifyReactBuild } from "./sponsors/daytona-build.server";
import {
  assetsFor,
  buildLaunchResult,
  contentFor,
  ensureEnrichedProfile,
  leadsFor,
  mergeContent,
  mergeLeads,
  padLaunchPack,
  profileProduct,
  strategyFor,
} from "./product-knowledge.server";
import type { AgentRunner, GtmContext } from "./types";
import type { LaunchLead } from "@/lib/launch-data";

function mergeApifySignals(
  base: LaunchLead[],
  signals: Awaited<ReturnType<typeof apifyHuntLeads>>,
): LaunchLead[] {
  if (!signals.length) return base;
  const merged = [...base];
  for (let i = 0; i < signals.length && i < merged.length; i++) {
    const s = signals[i];
    merged[i] = {
      name: s.title.slice(0, 60) || merged[i]?.name || `Lead ${i + 1}`,
      platform: (s.platform === "twitter" || s.platform === "reddit" || s.platform === "linkedin"
        ? s.platform
        : merged[i]?.platform ?? "reddit") as LaunchLead["platform"],
      handle: s.url.split("/").pop() ?? merged[i]?.handle ?? "profile",
      url: s.url,
      painSnippet: s.snippet.slice(0, 200) || merged[i]?.painSnippet || "",
      hook:
        merged[i]?.hook ||
        `Saw your post about "${s.snippet.slice(0, 80)}…" — thought this might help.`,
    };
  }
  return merged;
}

export const demoCmoAgent: AgentRunner = async (ctx, onLine) => {
  if (hasAiBackend()) {
    const ai = await aiCmoStrategy(ctx, onLine);
    if (ai) {
      await onLine(`ICP: ${ai.profile.icp.slice(0, 90)}…`);
      await onLine(`Channels: ${ai.profile.channels.slice(0, 3).join(", ")}`);
      return ai;
    }
    await onLine("CMO: falling back to domain templates (check .env AI key and restart dev server)");
  } else {
    await onLine("No AI key — using domain templates. Add your TokenRouter or Anthropic key to .env.");
  }

  const profile = profileProduct(ctx.input);
  const strategy = strategyFor(profile, ctx.input.launchGoal ?? "waitlist");
  await onLine(`Category: ${profile.category}`);
  await onLine("30-day GTM playbook drafted (templates)");
  return { profile, strategy };
};

export const demoHunterAgent: AgentRunner = async (ctx, onLine) => {
  const profile = ensureEnrichedProfile(ctx.input, ctx.profile);
  const templateLeads = leadsFor(profile, ctx.input.productDescription);

  const apifySignals = await apifyHuntLeads(
    profile.painPoint,
    profile.category,
    profile.locationHint,
    onLine,
  );
  const webSignals = apifySignals;

  let leads = templateLeads;

  if (hasAiBackend()) {
    const aiLeads = await aiHunterLeads({ ...ctx, profile }, webSignals, onLine);
    if (aiLeads?.length) {
      leads = mergeLeads(aiLeads, templateLeads);
      await onLine(`Lead Hunter: ${leads.length} contacts (AI + domain templates)`);
    } else {
      await onLine("Lead Hunter: blending domain templates with web signals");
    }
  } else {
    await onLine("Lead Hunter: domain templates (add API key for Claude contacts)");
  }

  leads = mergeApifySignals(leads, webSignals);
  await onLine(`Compiled ${leads.length} contacts for ${profile.category}`);
  return { leads };
};

export const demoContentAgent: AgentRunner = async (ctx, onLine) => {
  const profile = ensureEnrichedProfile(ctx.input, ctx.profile);
  const templateContent = contentFor(profile, ctx.input);

  if (hasAiBackend()) {
    const aiContent = await aiContentDrafts({ ...ctx, profile }, onLine);
    const content = aiContent?.length
      ? mergeContent(aiContent, templateContent)
      : templateContent;
    await onLine(`${content.length} post drafts for dashboard (${aiContent?.length ? "AI + templates" : "templates"})`);
    return { content };
  }

  await onLine(`${templateContent.length} post drafts ready (templates)`);
  return { content: templateContent };
};

export const demoBuilderAgent: AgentRunner = async (ctx, onLine) => {
  const profile = ctx.profile ?? profileProduct(ctx.input);
  const goal = ctx.input.launchGoal ?? "waitlist";

  let assets = assetsFor(profile, goal);

  if (hasAiBackend()) {
    const aiAssets = await aiBuilderAssets({ ...ctx, profile }, onLine);
    if (aiAssets) assets = aiAssets;
    else await onLine("Asset Builder: using template assets");
  } else {
    await onLine("Asset Builder: template assets (add API key to .env for custom pages)");
  }

  const landing = assets.find((a) => a.kind === "landing");
  if (landing) {
    const verified = await daytonaVerifyReactBuild(landing.code, onLine);
    if (verified) landing.buildStatus = "verified";
  }

  await onLine(`${assets.length} assets staged`);
  return { assets };
};

export const demoDeployAgent: AgentRunner = async (ctx, onLine) => {
  await onLine("Staging launch pack in memory…");
  await onLine(`Staging ${ctx.leads?.length ?? 0} contacts + ${ctx.content?.length ?? 0} drafts`);
  await onLine("Linking assets to launch record…");
  await onLine("Launch pack ready for your dashboard");
  return {};
};

export function finalizeLaunch(ctx: GtmContext) {
  const profile = ensureEnrichedProfile(ctx.input, ctx.profile);
  const strategy = ctx.strategy ?? strategyFor(profile, ctx.input.launchGoal ?? "waitlist");
  const padded = padLaunchPack({
    input: ctx.input,
    profile,
    leads: ctx.leads ?? [],
    content: ctx.content ?? [],
    assets: ctx.assets ?? [],
  });

  return buildLaunchResult({
    input: ctx.input,
    profile,
    strategy,
    leads: padded.leads,
    content: padded.content,
    assets: padded.assets,
  });
}
