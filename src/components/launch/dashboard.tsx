/** @deprecated Use MarketingDashboard in marketing-dashboard.tsx — kept for reference. */
import { useState } from "react";
import type { LaunchResult } from "@/lib/launch-data";
import {
  Check,
  Copy,
  ExternalLink,
  Megaphone,
  Rocket,
  Target,
  Users,
  Code2,
  Calendar,
} from "lucide-react";
import { apiApproveLaunch } from "@/lib/api/launch-client";

interface LaunchDashboardProps {
  result: LaunchResult;
  launchId: string | null;
  onApproved?: (r: LaunchResult) => void;
}

type Tab = "strategy" | "leads" | "content" | "assets";

export function LaunchDashboard({ result, launchId, onApproved }: LaunchDashboardProps) {
  const [tab, setTab] = useState<Tab>("strategy");
  const [approved, setApproved] = useState(result.approved);
  const [approving, setApproving] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const [approveError, setApproveError] = useState<string | null>(null);

  const copy = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
    }
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const approve = async () => {
    if (!launchId || approving || approved) return;
    setApproving(true);
    setApproveError(null);
    try {
      const updated = await apiApproveLaunch(launchId);
      setApproved(true);
      onApproved?.(updated);
    } catch (e) {
      setApproveError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setApproving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Status bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-emerald-500/30 bg-emerald-500/[0.06] p-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-emerald-400">Launch command center</div>
          <h2 className="mt-1 font-display text-3xl text-foreground">{result.productName}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{result.tagline}</p>
          <p className="mt-2 text-xs text-muted-foreground">ICP: {result.icp}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-400">
            {result.leads.length} contacts · {result.content.length} drafts · {result.assets.length} assets
          </span>
          <span className="text-xs text-muted-foreground">
            Compliance: {result.complianceStatus}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        <TabBtn active={tab === "strategy"} onClick={() => setTab("strategy")} icon={Calendar}>
          30-day plan
        </TabBtn>
        <TabBtn active={tab === "leads"} onClick={() => setTab("leads")} icon={Users}>
          Contacts ({result.leads.length})
        </TabBtn>
        <TabBtn active={tab === "content"} onClick={() => setTab("content")} icon={Megaphone}>
          Content
        </TabBtn>
        <TabBtn active={tab === "assets"} onClick={() => setTab("assets")} icon={Code2}>
          Assets
        </TabBtn>
      </div>

      {tab === "strategy" && (
        <section className="space-y-4">
          <p className="text-sm text-muted-foreground">{result.summary}</p>
          <ol className="space-y-3">
            {result.strategyTimeline.map((step) => (
              <li
                key={step.day}
                className="flex gap-4 rounded-xl border border-border surface-elevated p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary/15 font-mono text-sm text-primary">
                  D{step.day}
                </span>
                <div>
                  <div className="font-medium text-foreground">{step.channel}</div>
                  <p className="mt-1 text-sm text-muted-foreground">{step.action}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {tab === "leads" && (
        <section className="grid gap-3 md:grid-cols-2">
          {result.leads.map((lead, i) => (
            <div key={i} className="rounded-xl border border-border surface-elevated p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-foreground">{lead.name}</div>
                  <div className="text-xs text-primary">{lead.handle} · {lead.platform}</div>
                </div>
                <a
                  href={lead.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-muted-foreground hover:text-primary"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
              <p className="mt-2 text-xs italic text-muted-foreground">{lead.painSnippet}</p>
              <p className="mt-2 text-xs text-foreground/85">{lead.hook}</p>
            </div>
          ))}
        </section>
      )}

      {tab === "content" && (
        <section className="space-y-4">
          {result.content.map((c) => (
            <div key={c.id} className="rounded-xl border border-border surface-elevated p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wider text-primary">{c.platform}</div>
                  <div className="mt-1 font-medium text-foreground">{c.title}</div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(c.body, c.id)}
                  className="inline-flex shrink-0 items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-surface-elevated"
                >
                  {copied === c.id ? <Check size={12} /> : <Copy size={12} />}
                  {copied === c.id ? "Copied" : "Copy"}
                </button>
              </div>
              <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-background/60 p-3 font-sans text-sm leading-relaxed text-foreground/90">
                {c.body}
              </pre>
            </div>
          ))}
        </section>
      )}

      {tab === "assets" && (
        <section className="space-y-4">
          {result.assets.map((a) => (
            <div key={a.id} className="rounded-xl border border-border surface-elevated p-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-foreground">{a.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {a.kind} · build {a.buildStatus} · Daytona ✓
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => copy(a.code, a.id)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs"
                >
                  {copied === a.id ? <Check size={12} /> : <Copy size={12} />}
                  Copy code
                </button>
              </div>
              <pre className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-background/60 p-3 font-mono text-xs text-foreground/90">
                {a.code}
              </pre>
            </div>
          ))}
        </section>
      )}

      {/* Approve CTA */}
      <div className="sticky bottom-6 rounded-2xl border border-emerald-500/40 bg-zinc-950/95 p-6 shadow-2xl backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Target size={16} className="text-emerald-400" />
              {approved ? "Launch approved" : "Ready to go live"}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              Deploy to{" "}
              <a href={result.deploymentUrl} className="text-emerald-400 hover:underline" target="_blank" rel="noreferrer">
                {result.deploymentUrl}
              </a>
            </p>
          </div>
          <button
            type="button"
            disabled={approved || approving || !launchId}
            onClick={approve}
            className="inline-flex items-center gap-2 rounded-md bg-emerald-500 px-6 py-3 text-sm font-semibold text-zinc-950 shadow-[0_0_30px_-8px_oklch(0.72_0.18_155)] hover:opacity-90 disabled:opacity-50"
          >
            {approved ? (
              <>
                <Check size={16} /> Launched
              </>
            ) : approving ? (
              "Deploying…"
            ) : (
              <>
                <Rocket size={16} /> Approve & Launch
              </>
            )}
          </button>
        </div>
        {approveError && <p className="mt-3 text-xs text-destructive">{approveError}</p>}
      </div>
    </div>
  );
}

function TabBtn({
  active,
  onClick,
  children,
  icon: Icon,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  icon: typeof Users;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px inline-flex items-center gap-2 border-b-2 px-4 py-3 text-sm transition ${
        active ? "border-emerald-500 text-foreground" : "border-transparent text-muted-foreground hover:text-foreground"
      }`}
    >
      <Icon size={14} />
      {children}
    </button>
  );
}
