import { useMemo, useState } from "react";
import type { CaseResult } from "@/lib/verdict-data";
import {
  AlertTriangle,
  Check,
  ChevronRight,
  HelpCircle,
  ListChecks,
  MessageSquare,
  Scale,
  Shield,
  Sparkles,
  Swords,
} from "lucide-react";

interface SituationLabProps {
  result: CaseResult;
  caseId?: string | null;
  situation?: string | null;
}

const SIGNAL_STYLES = {
  strong: { bar: "bg-success", text: "text-success", label: "Strong" },
  mixed: { bar: "bg-warning", text: "text-warning", label: "Mixed" },
  weak: { bar: "bg-destructive", text: "text-destructive", label: "Uncertain" },
} as const;

type EvidenceItem = NonNullable<CaseResult["lab"]>["evidenceGaps"][number];

function postureFromEvidence(
  baseWin: number,
  gaps: EvidenceItem[],
): { win: number; signal: keyof typeof SIGNAL_STYLES; note: string } {
  const missingHigh = gaps.filter((g) => !g.haveIt && g.priority === "high").length;
  const missingMed = gaps.filter((g) => !g.haveIt && g.priority === "medium").length;
  const haveHigh = gaps.filter((g) => g.haveIt && g.priority === "high").length;
  const penalty = missingHigh * 10 + missingMed * 4;
  const bonus = haveHigh * 3;
  const win = Math.max(15, Math.min(95, baseWin - penalty + bonus));
  const signal = win >= 70 ? "strong" : win >= 50 ? "mixed" : "weak";
  const note =
    missingHigh > 0
      ? `Posture drops with ${missingHigh} high-priority gap${missingHigh > 1 ? "s" : ""} — gather those first.`
      : haveHigh >= 2
        ? "Key evidence in hand — posture reflects a stronger factual record."
        : "Toggle items below to see how missing proof shifts your position.";
  return { win, signal, note };
}

export function SituationLab({ result, caseId, situation }: SituationLabProps) {
  const lab = result.lab;
  const [question, setQuestion] = useState("");
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [asking, setAsking] = useState(false);
  const [evidence, setEvidence] = useState<EvidenceItem[]>(() => lab?.evidenceGaps ?? []);

  const posture = useMemo(
    () => postureFromEvidence(result.winProbability, evidence),
    [result.winProbability, evidence],
  );

  if (!lab) {
    return (
      <p className="text-sm text-muted-foreground">
        Lab insights loading… run a new analysis to enable the Situation Lab.
      </p>
    );
  }

  const signal = SIGNAL_STYLES[posture.signal];
  const missingHigh = evidence.filter((g) => !g.haveIt && g.priority === "high");

  const toggleEvidence = (item: string) => {
    setEvidence((prev) =>
      prev.map((g) => (g.item === item ? { ...g, haveIt: !g.haveIt } : g)),
    );
  };

  const ask = async (q: string) => {
    if (!q.trim()) return;
    if (!caseId) {
      setChat((c) => [
        ...c,
        {
          q,
          a: "Run Open Lab now or Full analysis from the input page to enable live follow-up against your saved case context.",
        },
      ]);
      return;
    }
    setAsking(true);
    setQuestion("");
    try {
      const response = await fetch("/api/case/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ caseId, question: q }),
      });
      const data = (await response.json()) as { answer?: string; error?: string };
      if (!response.ok || !data.answer) {
        throw new Error(data.error ?? "Lab question failed");
      }
      const { answer } = data;
      setChat((c) => [...c, { q, a: answer }]);
    } catch {
      setChat((c) => [
        ...c,
        { q, a: "Couldn't reach the lab right now — try rephrasing or start a new analysis." },
      ]);
    } finally {
      setAsking(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Your story */}
      <section className="rounded-2xl border border-border surface-elevated p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Your situation</div>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">
          {situation?.trim() || lab.situationSummary}
        </p>
        {situation && situation.length > 280 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Summary above is condensed — full text is saved with your case.
          </p>
        )}
      </section>

      {/* Liability signal — honest, updates with evidence toggles */}
      <section className="rounded-2xl border border-border surface-elevated p-6">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
            <Scale size={22} />
          </div>
          <div className="flex-1">
            <div className="text-xs uppercase tracking-wider text-muted-foreground">
              Liability signal
            </div>
            <div className={`mt-1 font-display text-2xl ${signal.text}`}>
              {posture.signal === lab.liabilitySignal
                ? lab.liabilityLabel
                : posture.signal === "strong"
                  ? "Liability signals look stronger with this evidence"
                  : posture.signal === "mixed"
                    ? "Liability is plausible but still disputed"
                    : "Liability is uncertain — more facts needed"}
            </div>
            <p className="mt-2 text-sm leading-relaxed text-foreground/85">
              {lab.liabilityReasoning}
            </p>
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <div
                  className={`h-full transition-all duration-500 ${signal.bar}`}
                  style={{ width: `${posture.win}%` }}
                />
              </div>
              <span className="font-mono text-xs text-muted-foreground">~{posture.win}% posture</span>
            </div>
            <p className="mt-2 text-[11px] text-muted-foreground">{posture.note}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Evidence gaps — interactive */}
        <section className="rounded-2xl border border-border surface-elevated p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <Shield size={14} /> Evidence checklist
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Tap items you have — watch the signal above shift. This is exploratory, not a legal conclusion.
          </p>
          <ul className="mt-4 space-y-3">
            {evidence.map((g) => (
              <li key={g.item}>
                <button
                  type="button"
                  onClick={() => toggleEvidence(g.item)}
                  className={`w-full rounded-lg border p-3 text-left transition hover:border-primary/40 ${
                    g.haveIt ? "border-success/30 bg-success/5" : "border-border"
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {g.haveIt ? (
                      <Check size={16} className="mt-0.5 shrink-0 text-success" />
                    ) : (
                      <AlertTriangle
                        size={16}
                        className={`mt-0.5 shrink-0 ${g.priority === "high" ? "text-warning" : "text-muted-foreground"}`}
                      />
                    )}
                    <div>
                      <div className="text-sm font-medium text-foreground">{g.item}</div>
                      <div className="mt-0.5 text-xs text-muted-foreground">{g.impact}</div>
                      <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                        {g.haveIt ? "Have it" : "Missing"} · {g.priority} priority
                      </div>
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {missingHigh.length > 0 && (
            <p className="mt-4 text-xs text-warning">
              Priority gaps: {missingHigh.map((g) => g.item).join(", ")}
            </p>
          )}
        </section>

        {/* Red team */}
        <section className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-destructive">
            <Swords size={14} /> Red Team — their best arguments
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            What the other side will say, and how you'd respond.
          </p>
          <div className="mt-4 space-y-4">
            {lab.redTeam.map((r) => (
              <div key={r.theirArgument} className="rounded-lg border border-border bg-background/60 p-4">
                <div className="text-[10px] uppercase tracking-wider text-destructive/80">They'll argue</div>
                <p className="mt-1 text-sm text-foreground/90">{r.theirArgument}</p>
                <div className="mt-3 text-[10px] uppercase tracking-wider text-primary">Your counter</div>
                <p className="mt-1 text-sm text-foreground/85">{r.yourResponse}</p>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* What-if scenarios */}
      <section className="rounded-2xl border border-border surface-elevated p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
          <Sparkles size={14} /> What would change this?
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {lab.scenarios.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => ask(s.question)}
              className="rounded-xl border border-border p-4 text-left transition hover:border-primary/40 hover:bg-primary/[0.03]"
            >
              <div className="font-medium text-sm text-foreground">{s.label}</div>
              <p className="mt-2 text-xs text-muted-foreground">{s.question}</p>
              <p className="mt-2 text-xs leading-relaxed text-foreground/85">{s.ifYes}</p>
              <div
                className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
                  s.signalShift === "stronger"
                    ? "bg-success/15 text-success"
                    : s.signalShift === "weaker"
                      ? "bg-destructive/15 text-destructive"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                Signal {s.signalShift}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Open questions */}
      {lab.openQuestions.length > 0 && (
        <section className="rounded-2xl border border-border surface-elevated p-6">
          <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
            <ListChecks size={14} /> Questions worth asking
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Common forks in cases like yours — click to explore in the chat below.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {lab.openQuestions.map((q) => (
              <button
                key={q}
                type="button"
                disabled={asking}
                onClick={() => ask(q)}
                className="rounded-full border border-border bg-background/80 px-3 py-1.5 text-xs text-foreground hover:border-primary/50 disabled:opacity-50"
              >
                {q}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Ask the lab */}
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.06] to-transparent p-6">
        <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-primary">
          <MessageSquare size={14} /> Ask the Situation Lab
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Follow-up questions against your case context — explore freely, like a research lab.
        </p>

        <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
          {chat.map((c, i) => (
            <div key={i} className="space-y-2">
              <div className="flex gap-2 text-sm">
                <HelpCircle size={14} className="mt-1 shrink-0 text-primary" />
                <span className="text-foreground/90">{c.q}</span>
              </div>
              <div className="ml-6 rounded-lg border border-border bg-background/80 p-3 text-sm leading-relaxed text-foreground/85 whitespace-pre-wrap">
                {c.a}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 flex gap-2">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && ask(question)}
            placeholder="e.g. Should I talk to their insurance company?"
            disabled={asking}
            className="flex-1 rounded-md border border-border bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() => ask(question)}
            disabled={asking || !question.trim()}
            className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-40"
          >
            Ask <ChevronRight size={14} />
          </button>
        </div>
        {!caseId && (
          <p className="mt-2 text-xs text-muted-foreground">
            Tip: use <strong>Open Lab now</strong> on the input page to save context for live follow-ups.
          </p>
        )}
      </section>
    </div>
  );
}
