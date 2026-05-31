import { SPONSORS } from "@/lib/sponsors";

export function SponsorStrip() {
  return (
    <section id="sponsors" className="mt-32">
      <div className="text-center">
        <div className="text-xs uppercase tracking-[0.18em] text-primary">Powered by</div>
        <h2 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
          Sponsor integrations
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
          Every tool in the stack is wired into the swarm — not just logo-slapped.
          Claude powers strategy and copy; Apify feeds lead research; Daytona sandboxes
          asset verification.
        </p>
      </div>

      <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SPONSORS.map((s) => (
          <a
            key={s.id}
            href={s.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group rounded-xl border border-border surface-elevated p-5 transition hover:border-primary/40"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="font-display text-lg text-foreground group-hover:text-primary transition">
                {s.name}
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">
                {s.usedIn}
              </span>
            </div>
            <div className="mt-1 text-xs text-muted-foreground">{s.tagline}</div>
            <p className="mt-3 text-sm leading-relaxed text-foreground/80">{s.description}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

export function SponsorBadges({ compact = false }: { compact?: boolean }) {
  const featured = ["Claude", "Apify", "Daytona"];
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center mt-6"}`}>
      {featured.map((name) => (
        <span
          key={name}
          className="rounded-full border border-border bg-surface-elevated px-2.5 py-1 text-[10px] uppercase tracking-wider text-muted-foreground"
        >
          {name}
        </span>
      ))}
    </div>
  );
}
