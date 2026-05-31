import { useEffect, useState } from "react";
import { SPONSORS_OFFLINE } from "@/lib/launch-sponsors";

type SponsorCard = {
  id: string;
  name: string;
  tagline: string;
  description: string;
  url: string;
  usedIn: string;
};

export function SponsorStrip() {
  const [sponsors, setSponsors] = useState<SponsorCard[]>([...SPONSORS_OFFLINE]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/launch/ai-status")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("status unavailable"))))
      .then((status: { sponsors?: { sponsors?: SponsorCard[] } | SponsorCard[] }) => {
        const activeSponsors = Array.isArray(status.sponsors)
          ? status.sponsors
          : status.sponsors?.sponsors;
        const publicSponsors = activeSponsors?.filter((s) => s.id !== "anthropic");
        if (publicSponsors?.length) {
          setSponsors(publicSponsors);
        }
      })
      .catch(() => {
        /* keep offline fallback */
      })
      .finally(() => setLoaded(true));
  }, []);

  if (loaded && sponsors.length === 0) {
    return (
      <section className="mt-24">
        <div className="text-center text-xs uppercase tracking-[0.18em] text-primary">
          Integrations
        </div>
        <p className="mx-auto mt-4 max-w-md text-center text-sm text-muted-foreground">
          Add API keys in <code className="text-emerald-400/90">.env</code> for Claude (TokenRouter),
          Apify, and Daytona. Template mode runs without keys.
        </p>
      </section>
    );
  }

  return (
    <section className="mt-24">
      <div className="text-center text-xs uppercase tracking-[0.18em] text-primary">
        {loaded && sponsors.length > 0 ? "Active integrations" : "Integrations"}
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {sponsors.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noreferrer"
            className="rounded-xl border border-border surface-elevated p-4 transition hover:border-primary/40"
          >
            <div className="font-medium text-foreground">{s.name}</div>
            <div className="text-[10px] uppercase tracking-wider text-primary">{s.tagline}</div>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{s.description}</p>
            <div className="mt-2 text-[10px] text-emerald-400/80">{s.usedIn}</div>
          </a>
        ))}
      </div>
    </section>
  );
}
