/** Apify — scrape social/web for GTM lead signals */
export interface LeadSignal {
  title: string;
  snippet: string;
  url: string;
  platform: string;
}

export async function apifyHuntLeads(
  painPoint: string,
  productCategory: string,
  locationHint: string | null | undefined,
  onLine: (line: string) => Promise<void>,
): Promise<LeadSignal[]> {
  const token = process.env.APIFY_API_TOKEN;
  if (!token) {
    await onLine("Apify not configured — using domain-aware lead synthesis");
    return [];
  }

  const loc = locationHint?.trim();
  const localTarget = loc ? `"${loc}"` : "near me";
  const cat = productCategory.toLowerCase();
  const pain = painPoint.toLowerCase();
  let query: string;

  if (/parking|parkade|surface lot/.test(cat) || /parking/.test(pain)) {
    query = [
      `"parking lot" ${localTarget}`,
      `"monthly parking" ${localTarget}`,
      `site:nextdoor.com ${localTarget} parking OR commute`,
      `site:google.com/maps parking ${loc ?? "near me"}`,
    ].join(" OR ");
  } else if (/dealership|used car|automotive|car lot/.test(cat)) {
    query = [
      `"used car" ${localTarget}`,
      `"used truck" ${localTarget}`,
      `site:facebook.com/marketplace ${localTarget} truck OR car`,
      `site:nextdoor.com ${localTarget} car OR dealership`,
    ].join(" OR ");
  } else if (/cafe|restaurant|coffee|local|shop|opening|food/.test(cat)) {
    query = [
      `"${productCategory}" ${localTarget} opening`,
      `"coffee shop" ${localTarget}`,
      `"cafe" ${localTarget}`,
      `site:nextdoor.com ${localTarget} cafe OR coffee OR restaurant`,
      `site:instagram.com ${localTarget} cafe OR coffee`,
      `site:yelp.com ${localTarget} cafe OR coffee`,
    ].join(" OR ");
  } else {
    query = `site:reddit.com OR site:twitter.com OR site:linkedin.com OR site:nextdoor.com "${painPoint}" ${productCategory} ${localTarget}`;
  }
  await onLine(`Apify: scraping social for "${painPoint.slice(0, 40)}…"`);

  try {
    const actorId = "apify~google-search-scraper";
    const res = await fetch(
      `https://api.apify.com/v2/acts/${actorId}/run-sync-get-dataset-items?token=${token}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queries: query,
          maxPagesPerQuery: 1,
          resultsPerPage: 15,
        }),
        signal: AbortSignal.timeout(25_000),
      },
    );

    if (!res.ok) {
      await onLine(`Apify returned ${res.status} — falling back to synthesized leads`);
      return [];
    }

    const items = (await res.json()) as Record<string, unknown>[];
    const signals: LeadSignal[] = [];

    const pushSignal = (title: string, snippet: string, url: string) => {
      if (!title || !snippet || !url) return;
      let platform = "web";
      if (url.includes("reddit.com")) platform = "reddit";
      else if (url.includes("twitter.com") || url.includes("x.com")) platform = "twitter";
      else if (url.includes("linkedin.com")) platform = "linkedin";
      else if (url.includes("nextdoor.com")) platform = "nextdoor";
      else if (url.includes("instagram.com")) platform = "instagram";
      else if (url.includes("facebook.com")) platform = "facebook";
      else if (url.includes("yelp.com")) platform = "google";

      signals.push({ title: title.slice(0, 120), snippet: snippet.slice(0, 280), url, platform });
    };

    for (const item of items) {
      const organic = item.organicResults as
        | { title?: string; url?: string; description?: string }[]
        | undefined;
      if (organic?.length) {
        for (const row of organic.slice(0, 15)) {
          pushSignal(
            String(row.title ?? ""),
            String(row.description ?? ""),
            String(row.url ?? ""),
          );
          if (signals.length >= 15) break;
        }
        continue;
      }

      const url = String(item.url ?? item.link ?? "");
      const title = String(item.title ?? item.pageTitle ?? "");
      const snippet = String(item.description ?? item.snippet ?? "");
      pushSignal(title, snippet, url);
      if (signals.length >= 15) break;
    }

    if (signals.length) {
      await onLine(`Apify: ${signals.length} live web signals for Lead Hunter`);
    }

    return signals;
  } catch (err) {
    await onLine(
      `Apify scrape failed (${err instanceof Error ? err.message : "error"}) — using synthesized leads`,
    );
    return [];
  }
}
