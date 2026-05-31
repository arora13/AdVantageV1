import type { LeadSignal } from "./apify-leads.server";

/** Rtrvr.ai — supplemental lead research when Apify is sparse */
export async function rtrvrEnrichLeads(
  painPoint: string,
  productCategory: string,
  onLine: (line: string) => Promise<void>,
): Promise<LeadSignal[]> {
  const apiKey = process.env.RTRVR_API_KEY?.trim();
  if (!apiKey) return [];

  const query = `${productCategory} ${painPoint} launch partners site:reddit.com OR site:linkedin.com`;
  await onLine("Rtrvr.ai: researching supplemental lead signals…");

  try {
    const res = await fetch("https://api.rtrvr.ai/v1/research", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, maxResults: 8 }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      await onLine(`Rtrvr.ai returned ${res.status} — skipping enrichment`);
      return [];
    }

    const data = (await res.json()) as {
      results?: { title?: string; snippet?: string; url?: string }[];
    };

    const signals: LeadSignal[] = [];
    for (const r of data.results ?? []) {
      const url = r.url ?? "";
      const title = r.title ?? "";
      const snippet = r.snippet ?? "";
      if (!url || !snippet) continue;

      let platform = "web";
      if (url.includes("reddit.com")) platform = "reddit";
      else if (url.includes("linkedin.com")) platform = "linkedin";

      signals.push({ title, snippet, url, platform });
      await onLine(`Rtrvr hit: ${title.slice(0, 50)}…`);
    }
    return signals;
  } catch (err) {
    await onLine(
      `Rtrvr.ai unavailable (${err instanceof Error ? err.message : "error"}) — continuing`,
    );
    return [];
  }
}
