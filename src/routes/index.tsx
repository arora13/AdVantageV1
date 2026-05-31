import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";
import { Header } from "@/components/launch/brand";
import { IntroHero } from "@/components/launch/intro-hero";
import { LaunchForm } from "@/components/launch/launch-form";
import { AGENTS } from "@/lib/launch-data";
import {
  ArrowRight, Compass, Megaphone, Search, Code2, Database, Zap, Target, Layers, Heart,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AdVantage — Marketing Team at Your Fingertips" },
      { name: "description", content: "Paste your product or business idea. Get 10 targeted contacts, launch copy, and assets in 3 minutes." },
    ],
  }),
  component: Landing,
});

const AGENT_ICONS = [Compass, Search, Megaphone, Code2, Database];

function Landing() {
  useEffect(() => {
    if (window.location.hash === "#tool") {
      document.getElementById("tool")?.scrollIntoView({ behavior: "smooth" });
    }
  }, []);

  return (
    <div className="relative overflow-x-hidden bg-background">
      <Header transparent />

      <IntroHero />

      {/* Tool section */}
      <section id="tool" className="relative isolate scroll-mt-20 border-t border-emerald-500/10 py-24 sm:py-32">
        <div className="hero-orb hero-orb-2 pointer-events-none !top-auto !bottom-0 !opacity-30" aria-hidden />
        <div className="relative z-10 mx-auto max-w-3xl px-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border/80 bg-zinc-950/50 px-3 py-1 font-mono text-[10px] uppercase tracking-widest text-emerald-400">
              <Zap size={10} /> Live tool
            </div>
            <h2 className="mt-5 font-display text-4xl tracking-tight sm:text-5xl">
              What&apos;s your <span className="text-gradient">business?</span>
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-sm text-muted-foreground">
              Used cars, cafe, salon, SaaS — describe it once. We build your marketing dashboard with posts you control.
            </p>
          </div>

          <div className="mt-12 rounded-3xl border border-border/60 bg-zinc-950/30 p-6 backdrop-blur-xl sm:p-8">
            <LaunchForm embedded />
          </div>
        </div>
      </section>

      {/* Features strip */}
      <section className="border-y border-border/40 bg-zinc-950/20 py-20">
        <div className="mx-auto grid max-w-6xl gap-6 px-6 md:grid-cols-3">
          {[
            { title: "You approve every post", body: "AI suggests Instagram, Facebook, and local posts. Nothing publishes until you approve it — dismiss ideas you don't want.", icon: Heart },
            { title: "Copy & publish yourself", body: "Approve post ideas, copy captions, and mark them done when live on Instagram or other channels.", icon: Megaphone },
            { title: "Contacts & plan", body: "Partners, buyers, and communities to reach — plus a 30-day plan on the same dashboard.", icon: Search },
          ].map((f) => (
            <div
              key={f.title}
              className="group relative overflow-hidden rounded-2xl border border-border/60 bg-background/40 p-6 transition duration-300 hover:border-emerald-500/40 hover:shadow-[0_0_40px_-15px_oklch(0.72_0.18_155_/_0.3)]"
            >
              <div className="absolute -right-4 -top-4 size-24 rounded-full bg-emerald-500/5 blur-2xl transition group-hover:bg-emerald-500/10" />
              <div className="relative grid size-11 place-items-center rounded-xl bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20">
                <f.icon size={20} />
              </div>
              <div className="relative mt-5 font-display text-xl text-foreground">{f.title}</div>
              <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Agents pipeline */}
      <section id="how" className="relative py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-emerald-400">
              <Layers size={12} /> How it works
            </div>
            <h2 className="mt-4 font-display text-4xl tracking-tight sm:text-6xl">
              Five agents. <span className="text-gradient">One launch.</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-sm text-muted-foreground">
              From product description to staged GTM pack in under 3 minutes.
            </p>
          </div>

          <div id="agents" className="relative mt-16">
            <div className="absolute left-0 right-0 top-1/2 hidden h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent md:block" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {AGENTS.map((a, i) => {
                const Icon = AGENT_ICONS[i];
                return (
                  <div
                    key={a.id}
                    className="group relative rounded-2xl border border-border/70 bg-zinc-950/40 p-5 backdrop-blur-sm transition hover:-translate-y-1 hover:border-emerald-500/40 hover:shadow-[0_20px_40px_-20px_oklch(0.72_0.18_155_/_0.25)]"
                  >
                    <div className="flex items-center justify-between">
                      <div className="grid size-10 place-items-center rounded-lg bg-emerald-500/10 text-emerald-400 ring-1 ring-emerald-500/20 transition group-hover:bg-emerald-500 group-hover:text-zinc-950">
                        <Icon size={18} />
                      </div>
                      <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
                    </div>
                    <div className="mt-4 font-medium text-foreground">{a.name}</div>
                    <div className="mt-0.5 text-[10px] uppercase tracking-wider text-emerald-400/80">{a.role}</div>
                    <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{a.description}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-24">
        <div className="relative overflow-hidden rounded-3xl border border-emerald-500/25 p-10 text-center sm:p-14">
          <div className="hero-orb hero-orb-1 !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 !opacity-40" aria-hidden />
          <Target className="relative mx-auto text-emerald-400" size={36} />
          <h3 className="relative mt-5 font-display text-3xl tracking-tight sm:text-4xl">
            Suggest. Approve. <span className="text-gradient">Publish.</span>
          </h3>
          <p className="relative mx-auto mt-3 max-w-md text-sm text-muted-foreground">
            Your marketing team proposes posts — you decide what goes live. Nothing hits Instagram without your OK.
          </p>
          <a
            href="#tool"
            className="relative mt-8 inline-flex items-center gap-2 rounded-full bg-emerald-500 px-6 py-3.5 text-sm font-semibold text-zinc-950 shadow-[0_0_40px_-10px_oklch(0.72_0.18_155)] transition hover:scale-[1.02]"
          >
            Build my dashboard <ArrowRight size={16} />
          </a>
        </div>

        <footer className="mt-16 border-t border-border/40 pt-8 text-center text-xs text-muted-foreground">
          AdVantage stages outreach for your review. You are responsible for platform ToS and compliance.
        </footer>
      </section>
    </div>
  );
}
