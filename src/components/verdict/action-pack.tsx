import { useState } from "react";
import type { CaseResult } from "@/lib/verdict-data";
import { Check, Copy, Download, FileText, ListChecks, MessageSquare, ScrollText } from "lucide-react";

interface ActionPackViewProps {
  result: CaseResult;
}

const KIND_ICONS = {
  letter: FileText,
  checklist: ListChecks,
  script: MessageSquare,
  timeline: ScrollText,
  brief: ScrollText,
} as const;

export function ActionPackView({ result }: ActionPackViewProps) {
  const pack = result.actions;
  const [activeId, setActiveId] = useState<string | null>(pack?.artifacts[0]?.id ?? null);
  const [copied, setCopied] = useState(false);

  if (!pack) {
    return (
      <p className="text-sm text-muted-foreground">
        Run a new analysis to generate your action pack.
      </p>
    );
  }

  const active = pack.artifacts.find((a) => a.id === activeId) ?? pack.artifacts[0];

  const copyContent = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadAll = () => {
    const body = [
      `# ${pack.headline}`,
      "",
      pack.plainEnglish,
      "",
      "## Takeaways",
      ...pack.takeaways.map((t) => `- ${t}`),
      "",
      "## Timeline",
      ...pack.timeline.map((t) => `- **${t.when}**: ${t.action}`),
      "",
      ...pack.artifacts.flatMap((a) => [
        `## ${a.title}`,
        "",
        a.content,
        "",
      ]),
    ].join("\n");

    const blob = new Blob([body], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "verdict-action-pack.md";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <section className="rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.08] to-transparent p-6">
        <div className="text-xs uppercase tracking-wider text-primary">Action pack</div>
        <h2 className="mt-2 font-display text-2xl text-foreground">{pack.headline}</h2>
        <p className="mt-3 text-sm leading-relaxed text-foreground/90">{pack.plainEnglish}</p>
        <ul className="mt-4 space-y-2">
          {pack.takeaways.map((t) => (
            <li key={t} className="flex gap-2 text-sm text-foreground/85">
              <Check size={14} className="mt-1 shrink-0 text-success" />
              {t}
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={downloadAll}
          className="mt-5 inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          <Download size={14} /> Download full pack
        </button>
      </section>

      <section className="rounded-2xl border border-border surface-elevated p-6">
        <div className="text-xs uppercase tracking-wider text-muted-foreground">Execution timeline</div>
        <ol className="mt-4 space-y-4">
          {pack.timeline.map((step, i) => (
            <li key={step.when} className="flex gap-4">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary/15 font-mono text-xs text-primary">
                {i + 1}
              </span>
              <div>
                <div className="text-sm font-medium text-foreground">{step.when}</div>
                <p className="mt-0.5 text-sm text-muted-foreground">{step.action}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div className="space-y-2">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Deliverables</div>
          {pack.artifacts.map((artifact) => {
            const Icon = KIND_ICONS[artifact.kind];
            const selected = active?.id === artifact.id;
            return (
              <button
                key={artifact.id}
                type="button"
                onClick={() => setActiveId(artifact.id)}
                className={`flex w-full items-start gap-3 rounded-lg border p-3 text-left transition ${
                  selected ? "border-primary/50 bg-primary/5" : "border-border hover:border-primary/30"
                }`}
              >
                <Icon size={16} className="mt-0.5 shrink-0 text-primary" />
                <div>
                  <div className="text-sm font-medium text-foreground">{artifact.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{artifact.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        {active && (
          <div className="rounded-2xl border border-border surface-elevated p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="font-display text-lg text-foreground">{active.title}</div>
                <p className="mt-1 text-xs text-muted-foreground">{active.description}</p>
              </div>
              <button
                type="button"
                onClick={() => copyContent(active.content)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border px-3 py-2 text-xs hover:bg-surface-elevated"
              >
                {copied ? <Check size={12} /> : <Copy size={12} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="mt-4 max-h-[480px] overflow-y-auto whitespace-pre-wrap break-words rounded-lg border border-border bg-background/60 p-4 font-mono text-[13px] leading-relaxed text-foreground/95">
              {active.content}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
