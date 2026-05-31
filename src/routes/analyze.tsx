import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/launch/brand";
import { apiFetchLaunchResult, apiPollLaunchProgress, apiStartLaunch } from "@/lib/api/launch-client";
import { goToLaunchTool } from "@/lib/launch-session";
import { AGENTS, type AgentId } from "@/lib/launch-data";
import {
  Check, Loader2, Compass, Search, Megaphone, Code2, Database,
} from "lucide-react";

export const Route = createFileRoute("/analyze")({
  head: () => ({
    meta: [
      { title: "GTM Swarm Running — AdVantage" },
      { name: "description", content: "Five agents executing your go-to-market launch." },
    ],
  }),
  component: AnalyzePage,
});

type Status = "pending" | "running" | "complete" | "failed";
const AGENT_ICONS = [Compass, Search, Megaphone, Code2, Database];

interface StoredInput {
  productDescription: string;
  productName?: string;
  repoUrl?: string | null;
  launchGoal?: string;
  launchId?: string;
}

function AnalyzePage() {
  const navigate = useNavigate();
  const [input, setInput] = useState<StoredInput | null>(null);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [statuses, setStatuses] = useState<Record<AgentId, Status>>(
    () => Object.fromEntries(AGENTS.map((a) => [a.id, "pending" as Status])) as Record<AgentId, Status>,
  );
  const [streamed, setStreamed] = useState<Record<AgentId, string[]>>(
    () => Object.fromEntries(AGENTS.map((a) => [a.id, [] as string[]])) as Record<AgentId, string[]>,
  );
  const [agentSponsors, setAgentSponsors] = useState<Partial<Record<AgentId, string>>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? sessionStorage.getItem("launch:input") : null;
    if (!raw) {
      goToLaunchTool();
      return;
    }

    const parsed = JSON.parse(raw) as StoredInput;

    if (parsed.launchId) {
      setInput(parsed);
      setBootstrapping(false);
      return;
    }

    if (!parsed.productDescription || parsed.productDescription.trim().length < 10) {
      goToLaunchTool();
      return;
    }

    (async () => {
      try {
        const { launchId } = await apiStartLaunch({
          productDescription: parsed.productDescription,
          productName: parsed.productName,
          repoUrl: parsed.repoUrl ?? null,
          launchGoal: (parsed.launchGoal as "waitlist" | "beta" | "paid") ?? "waitlist",
        });
        const updated = { ...parsed, launchId };
        sessionStorage.setItem("launch:input", JSON.stringify(updated));
        sessionStorage.setItem("launch:launchId", launchId);
        setInput(updated);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start GTM swarm");
      } finally {
        setBootstrapping(false);
      }
    })();
  }, [navigate]);

  useEffect(() => {
    if (!input?.launchId) return;

    let cancelled = false;

    const poll = async () => {
      try {
        const progress = await apiPollLaunchProgress(input.launchId!);
        if (cancelled) return;

        setStatuses((prev) => {
          const next = { ...prev };
          for (const agent of progress.agents) {
            next[agent.agentId] = agent.status;
          }
          return next;
        });
        setStreamed((prev) => {
          const next = { ...prev };
          for (const agent of progress.agents) {
            next[agent.agentId] = agent.streamLines;
          }
          return next;
        });
        setAgentSponsors((prev) => {
          const next = { ...prev };
          for (const agent of progress.agents) {
            if (agent.sponsor) next[agent.agentId] = agent.sponsor;
          }
          return next;
        });

        if (progress.status === "complete") {
          sessionStorage.setItem("launch:launchId", input.launchId!);
          sessionStorage.setItem(
            "launch:progress",
            JSON.stringify({ launchId: input.launchId, progress, savedAt: Date.now() }),
          );
          try {
            const data = await apiFetchLaunchResult(input.launchId!);
            sessionStorage.setItem(
              "launch:result",
              JSON.stringify({ launchId: input.launchId, result: data, savedAt: Date.now() }),
            );
          } catch { /* dashboard will fetch if cache miss */ }
          await new Promise((r) => setTimeout(r, 500));
          if (!cancelled) navigate({ to: "/dashboard" });
          return;
        }

        if (progress.status === "failed") {
          setError(progress.error ?? "GTM swarm failed");
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load swarm progress");
        }
      }
    };

    poll();
    const interval = setInterval(poll, 600);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [input?.launchId, navigate]);

  if (!input || bootstrapping) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex max-w-4xl flex-col items-center justify-center px-6 pt-32">
          <Loader2 size={28} className="animate-spin text-emerald-400" />
          <p className="mt-4 text-sm text-muted-foreground">Starting GTM agent swarm…</p>
        </main>
      </div>
    );
  }

  const completed = Object.values(statuses).filter((s) => s === "complete").length;
  const running = Object.values(statuses).filter((s) => s === "running").length;
  const progress = Math.round(((completed + running * 0.5) / AGENTS.length) * 100);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="sticky top-0 z-10 border-b border-border bg-background/80 backdrop-blur">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              {completed} of {AGENTS.length} agents complete · live swarm
            </span>
            <span className="font-mono text-emerald-400">{progress}%</span>
          </div>
          <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      <main className="mx-auto max-w-4xl px-6 pt-10 pb-24">
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          Building your <span className="text-gradient">dashboard.</span>
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Strategy → contacts → post recommendations → assets — then you approve what goes live
        </p>

        {error && (
          <div className="mt-6 space-y-3 rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            <p>{error}</p>
            <button
              type="button"
              onClick={goToLaunchTool}
              className="text-xs font-medium text-emerald-400 hover:underline"
            >
              ← Try again from launch tool
            </button>
          </div>
        )}

        <div className="mt-10 space-y-3">
          {AGENTS.map((agent, i) => {
            const Icon = AGENT_ICONS[i];
            const status = statuses[agent.id];
            const lines = streamed[agent.id];
            const sponsorLabel = agentSponsors[agent.id];
            return (
              <div
                key={agent.id}
                className={`rounded-xl border p-5 transition ${
                  status === "running"
                    ? "border-emerald-500/50 surface-elevated glow"
                    : status === "complete"
                    ? "border-border surface"
                    : status === "failed"
                    ? "border-destructive/40 surface"
                    : "border-border/60 surface opacity-60"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`grid size-11 shrink-0 place-items-center rounded-lg transition ${
                      status === "complete"
                        ? "bg-emerald-500 text-zinc-950"
                        : status === "running"
                        ? "bg-emerald-500/15 text-emerald-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {status === "complete" ? (
                      <Check size={20} strokeWidth={3} />
                    ) : status === "running" ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : (
                      <Icon size={20} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium text-foreground">{agent.name}</div>
                    <div className="text-xs text-muted-foreground">{agent.description}</div>
                    {sponsorLabel && (
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-emerald-400/80">
                        Powered by {sponsorLabel}
                      </div>
                    )}
                    {(status === "running" || status === "complete") && lines.length > 0 && (
                      <div className="mt-4 rounded-md border border-border bg-background/60 p-3 font-mono text-[12px] leading-relaxed">
                        {lines.map((l, idx) => (
                          <div key={idx} className="text-foreground/85">
                            <span className="text-emerald-400/70">›</span> {l}
                          </div>
                        ))}
                        {status === "running" && (
                          <div className="mt-1 inline-block h-3 w-32 rounded bg-muted shimmer" />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
