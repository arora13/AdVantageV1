import type { StatuteEntry } from "../types";

/** Rtrvr.ai — web retrieval fallback when Apify returns sparse results */
export async function rtrvrResearchFallback(
  query: string,
  onLine: (line: string) => Promise<void>,
): Promise<StatuteEntry[]> {
  const apiKey = process.env.RTRVR_API_KEY;
  if (!apiKey) return [];

  await onLine("Rtrvr.ai retrieving supplemental legal sources…");

  try {
    const res = await fetch("https://api.rtrvr.ai/v1/research", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ query, maxResults: 4 }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return [];

    const data = (await res.json()) as {
      results?: { title?: string; snippet?: string; url?: string }[];
    };

    return (data.results ?? []).map((r) => ({
      cite: r.title ?? r.url ?? "Web source",
      summary: r.snippet ?? "",
      source: "Rtrvr.ai",
    }));
  } catch {
    await onLine("Rtrvr.ai unavailable — continuing with AI knowledge");
    return [];
  }
}
