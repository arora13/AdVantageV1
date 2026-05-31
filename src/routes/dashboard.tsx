import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/launch/brand";
import { MarketingDashboard } from "@/components/launch/marketing-dashboard";
import { apiFetchLaunchResult } from "@/lib/api/launch-client";
import { goToLaunchTool } from "@/lib/launch-session";
import { initWorkspaceFromLaunch, loadWorkspace, saveWorkspace } from "@/lib/marketing-queue";
import type { LaunchResult } from "@/lib/launch-data";
import type { LaunchProgress } from "@/lib/gtm/types";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Marketing Dashboard — AdVantage" },
      {
        name: "description",
        content: "Review AI post recommendations, approve what you like, and publish to Instagram.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const navigate = useNavigate();
  const [launchId, setLaunchId] = useState<string | null>(null);
  const [result, setResult] = useState<LaunchResult | null>(null);
  const [agentProgress, setAgentProgress] = useState<LaunchProgress | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const id =
      typeof window !== "undefined"
        ? sessionStorage.getItem("launch:launchId") ??
          (() => {
            try {
              return JSON.parse(sessionStorage.getItem("launch:input") ?? "{}").launchId;
            } catch {
              return null;
            }
          })()
        : null;

    setLaunchId(id);
    const progressRaw =
      typeof window !== "undefined" ? sessionStorage.getItem("launch:progress") : null;
    if (progressRaw) {
      try {
        const cached = JSON.parse(progressRaw) as { launchId: string; progress: LaunchProgress };
        if (cached.launchId === id) setAgentProgress(cached.progress);
      } catch { /* ignore */ }
    }

    if (!id) {
      goToLaunchTool();
      return;
    }

    const cachedWorkspace = loadWorkspace();
    if (cachedWorkspace?.launchId === id) {
      setResult(cachedWorkspace.result);
      setLoading(false);
      return;
    }

    const cachedRaw =
      typeof window !== "undefined" ? sessionStorage.getItem("launch:result") : null;
    if (cachedRaw) {
      try {
        const cached = JSON.parse(cachedRaw) as { launchId: string; result: LaunchResult };
        if (cached.launchId === id && cached.result) {
          setResult(cached.result);
          saveWorkspace(initWorkspaceFromLaunch(id, cached.result));
          setLoading(false);
          return;
        }
      } catch { /* fetch */ }
    }

    let cancelled = false;
    let attempts = 0;
    const load = async () => {
      attempts += 1;
      try {
        const data = await apiFetchLaunchResult(id);
        if (!cancelled) {
          sessionStorage.setItem(
            "launch:result",
            JSON.stringify({ launchId: id, result: data, savedAt: Date.now() }),
          );
          saveWorkspace(initWorkspaceFromLaunch(id, data));
          setResult(data);
          setLoading(false);
        }
      } catch (e) {
        if (cancelled) return;
        if (attempts >= 15) {
          setLoadError(e instanceof Error ? e.message : "Could not load dashboard");
          setLoading(false);
          return;
        }
        setTimeout(load, 1000);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  if (loadError) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex max-w-6xl flex-col items-center justify-center px-6 pt-32">
          <p className="text-sm text-destructive">{loadError}</p>
          <button
            type="button"
            onClick={goToLaunchTool}
            className="mt-4 text-sm text-emerald-400 hover:underline"
          >
            ← Set up your business
          </button>
        </main>
      </div>
    );
  }

  if (loading || !result || !launchId) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="mx-auto flex max-w-6xl flex-col items-center justify-center px-6 pt-32">
          <Loader2 size={32} className="animate-spin text-emerald-400" />
          <p className="mt-4 text-sm text-muted-foreground">Loading your marketing dashboard…</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="mx-auto max-w-[1400px] px-6 pt-10 pb-24">
        <button
          type="button"
          onClick={goToLaunchTool}
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          ← New business setup
        </button>

        <div className="mt-6">
          <MarketingDashboard
            launchId={launchId}
            initialResult={result}
            agentProgress={agentProgress}
          />
        </div>
      </main>
    </div>
  );
}
