import type { StatuteEntry } from "./types";

const APIFY_BASE = "https://api.apify.com/v2";

/** Apify — scrape statutes & case law for the jurisdiction */
export async function apifyResearchStatutes(
  jurisdiction: string,
  disputeType: string,
  keyTerms: string[],
  onLine: (line: string) => Promise<void>,
): Promise<StatuteEntry[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    await onLine("Apify not configured — using Claude knowledge fallback");
    return [];
  }

  const query = `${disputeType} ${jurisdiction} ${keyTerms.slice(0, 3).join(" ")} statute law`;
  await onLine(`Querying Apify web scraper for "${query.slice(0, 60)}…"`);

  try {
    // Generic Google search actor — swap for a legal-specific actor in production
    const actorId = "apify~google-search-scraper";
    const res = await fetch(
      `${APIFY_BASE}/acts/${actorId}/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: query,
          maxPagesPerQuery: 1,
          resultsPerPage: 5,
        }),
        signal: AbortSignal.timeout(25_000),
      },
    );

    if (!res.ok) {
      await onLine(`Apify returned ${res.status} — falling back to AI knowledge`);
      return [];
    }

    const items = (await res.json()) as Record<string, unknown>[];
    const statutes: StatuteEntry[] = [];

    for (const item of items.slice(0, 6)) {
      const title = String(item.title ?? item.pageTitle ?? "");
      const desc = String(item.description ?? item.snippet ?? item.text ?? "");
      const url = String(item.url ?? item.link ?? "");
      if (!title && !desc) continue;
      statutes.push({
        cite: title.slice(0, 120) || url,
        summary: desc.slice(0, 400),
        source: "Apify",
      });
      await onLine(`Retrieved via Apify: ${title.slice(0, 70)}…`);
    }

    return statutes;
  } catch (err) {
    await onLine(
      `Apify scrape failed (${err instanceof Error ? err.message : "error"}) — using AI fallback`,
    );
    return [];
  }
}
