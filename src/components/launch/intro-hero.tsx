import { AGENTS } from "@/lib/launch-data";
import { ChevronDown, Sparkles } from "lucide-react";

const FLOATING_STATS = [
  { label: "10 contacts", delay: "0s" },
  { label: "6 drafts", delay: "0.4s" },
  { label: "2 assets", delay: "0.8s" },
  { label: "~3 min", delay: "1.2s" },
];

export function IntroHero() {
  const scrollToTool = () => {
    document.getElementById("tool")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <section
      id="intro"
      className="relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden px-6"
    >
      {/* Ambient layers */}
      <div className="hero-orb hero-orb-1" aria-hidden />
      <div className="hero-orb hero-orb-2" aria-hidden />
      <div className="hero-orb hero-orb-3" aria-hidden />
      <div className="hero-noise pointer-events-none absolute inset-0 opacity-[0.35]" aria-hidden />
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

      {/* Floating stat pills */}
      <div className="pointer-events-none absolute inset-0 hidden lg:block" aria-hidden>
        {FLOATING_STATS.map((s, i) => (
          <div
            key={s.label}
            className="hero-float absolute rounded-full border border-emerald-500/20 bg-zinc-950/50 px-4 py-2 font-mono text-[11px] text-emerald-400/90 backdrop-blur-md"
            style={{
              animationDelay: s.delay,
              top: `${18 + i * 14}%`,
              left: i % 2 === 0 ? "8%" : undefined,
              right: i % 2 === 1 ? "8%" : undefined,
            }}
          >
            {s.label}
          </div>
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-5xl text-center">
        <div className="hero-fade-in mb-8 inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-1.5 text-xs text-emerald-400 backdrop-blur-sm">
          <Sparkles size={12} className="animate-pulse" />
          Your marketing command center
        </div>

        <h1
          className="hero-fade-in hero-fade-in-delay-1 font-display text-[clamp(2.75rem,8vw,5.5rem)] leading-[0.95] tracking-tight text-foreground"
          style={{ animationDelay: "0.1s" }}
        >
          Marketing team
          <br />
          <span className="text-gradient italic">at your fingertips.</span>
        </h1>

        <p
          className="hero-fade-in hero-fade-in-delay-2 mx-auto mt-8 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg"
          style={{ animationDelay: "0.25s" }}
        >
          Tell us about your business — a used car lot, cafe, SaaS app, anything. AI builds your
          marketing dashboard with post ideas. You approve what you like; only approved posts go
          to Instagram and your channels.
        </p>

        {/* Mini agent orbit */}
        <div
          className="hero-fade-in hero-fade-in-delay-3 mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-2"
          style={{ animationDelay: "0.4s" }}
        >
          {AGENTS.map((a, i) => (
            <span
              key={a.id}
              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-zinc-950/40 px-3 py-1.5 text-xs backdrop-blur-sm transition hover:border-emerald-500/40 hover:bg-emerald-500/[0.06]"
              style={{ animationDelay: `${0.5 + i * 0.08}s` }}
            >
              <span className="font-mono text-[10px] text-emerald-500/80">0{i + 1}</span>
              <span className="text-foreground/90">{a.name}</span>
            </span>
          ))}
        </div>

        <div className="hero-fade-in hero-fade-in-delay-4 mt-12 flex flex-col items-center gap-6" style={{ animationDelay: "0.55s" }}>
          <button
            type="button"
            onClick={scrollToTool}
            className="group relative inline-flex cursor-pointer items-center gap-2 overflow-hidden rounded-full bg-emerald-500 px-8 py-4 text-sm font-semibold text-zinc-950 shadow-[0_0_50px_-12px_oklch(0.72_0.18_155)] transition hover:scale-[1.03] active:scale-[0.98]"
          >
            <span className="pointer-events-none absolute inset-0 bg-gradient-to-r from-emerald-400 to-emerald-600 opacity-0 transition group-hover:opacity-100" />
            <span className="relative z-10">Set up your dashboard</span>
          </button>
        </div>
      </div>

      <button
        type="button"
        onClick={scrollToTool}
        aria-label="Scroll to tool"
        className="scroll-cue absolute bottom-10 left-1/2 z-10 -translate-x-1/2 text-muted-foreground transition hover:text-emerald-400"
      >
        <ChevronDown size={28} strokeWidth={1.5} />
      </button>

      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent" />
    </section>
  );
}
