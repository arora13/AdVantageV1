import { useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { apiStartLaunch } from "@/lib/api/launch-client";
import { Github, Loader2, Rocket, Sparkles } from "lucide-react";

const GOALS = [
  { id: "waitlist" as const, label: "Waitlist" },
  { id: "beta" as const, label: "Beta access" },
  { id: "paid" as const, label: "Sales launch" },
];

const MIN_CHARS = 10;

interface LaunchFormProps {
  embedded?: boolean;
}

export function LaunchForm({ embedded = false }: LaunchFormProps) {
  const navigate = useNavigate();
  const formRef = useRef<HTMLFormElement>(null);
  const [description, setDescription] = useState("");
  const [productName, setProductName] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const [launchGoal, setLaunchGoal] = useState<"waitlist" | "beta" | "paid">("waitlist");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiReady, setAiReady] = useState<boolean | null>(null);
  const [aiHint, setAiHint] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/launch/ai-status")
      .then((r) => r.json())
      .then((s: {
        ai?: boolean;
        aiEnv?: { message: string; keyPresent?: boolean; status?: string; provider?: string };
        anthropicEnv?: { message: string; keyPresent?: boolean; status?: string; provider?: string };
        verify?: { ok: boolean; message: string; provider?: string } | null;
      }) => {
        const env = s.aiEnv ?? s.anthropicEnv;
        const tokenRouter =
          env?.status === "tokenrouter_ready" || env?.provider === "tokenrouter";
        setAiReady(Boolean(s.ai));
        if (s.ai) {
          setAiHint(null);
        } else if (tokenRouter && env?.keyPresent) {
          setAiHint(
            `TokenRouter key found in .env but API check failed: ${s.verify?.message ?? "restart npm run dev"}`,
          );
        } else if (s.verify && !s.verify.ok) {
          setAiHint(s.verify.message);
        } else if (env?.message) {
          setAiHint(env.message);
        } else {
          setAiHint("Paste your TokenRouter or Anthropic key in .env, save, then restart npm run dev.");
        }
      })
      .catch(() => {
        setAiReady(false);
        setAiHint("Could not read server env. Restart npm run dev after editing .env.");
      });
  }, []);

  const trimmed = description.trim();
  const canSubmit = trimmed.length >= MIN_CHARS;
  const charsNeeded = Math.max(0, MIN_CHARS - trimmed.length);

  const readFormValues = () => {
    const form = formRef.current;
    if (!form) {
      return {
        productDescription: trimmed,
        productName: productName.trim(),
        repoUrl: repoUrl.trim(),
        launchGoal,
      };
    }
    const fd = new FormData(form);
    const desc = String(fd.get("productDescription") ?? "").trim();
    const name = String(fd.get("productName") ?? "").trim();
    const repo = String(fd.get("repoUrl") ?? "").trim();
    const goal = String(fd.get("launchGoal") ?? launchGoal) as "waitlist" | "beta" | "paid";
    return {
      productDescription: desc || trimmed,
      productName: name,
      repoUrl: repo,
      launchGoal: goal === "beta" || goal === "paid" ? goal : "waitlist",
    };
  };

  const submit = async () => {
    if (submitting) return;

    const values = readFormValues();
    if (values.productDescription.length < MIN_CHARS) {
      setError(`Describe your business in at least ${MIN_CHARS} characters (${values.productDescription.length}/${MIN_CHARS}).`);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const goal = values.launchGoal;
      const launchGoal =
        goal === "beta" || goal === "paid" || goal === "waitlist" ? goal : "waitlist";
      const payload = {
        productDescription: values.productDescription,
        productName: values.productName || undefined,
        repoUrl: values.repoUrl || null,
        launchGoal,
      };
      const { launchId } = await apiStartLaunch(payload);
      sessionStorage.setItem("launch:input", JSON.stringify({ ...payload, launchId }));
      sessionStorage.setItem("launch:launchId", launchId);
      sessionStorage.removeItem("launch:result");
      try {
        await navigate({ to: "/analyze" });
      } catch {
        window.location.assign("/analyze");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start launch");
      setSubmitting(false);
    }
  };

  const onFormSubmit = (e: FormEvent) => {
    e.preventDefault();
    void submit();
  };

  return (
    <form
      ref={formRef}
      className={`relative z-20 ${embedded ? "space-y-5" : "mt-10 space-y-4"}`}
      onSubmit={onFormSubmit}
      noValidate
    >
      {aiReady === false && aiHint && (
        <p className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-xs leading-relaxed text-amber-200/90">
          {aiHint} Agents will use templates until this is fixed. Run{" "}
          <code className="text-emerald-300">npm run check:ai</code> in the project folder.
        </p>
      )}
      <div className="group relative rounded-2xl border border-emerald-500/20 bg-zinc-950/60 p-1 shadow-[0_0_80px_-20px_oklch(0.72_0.18_155_/_0.35)] backdrop-blur-xl transition focus-within:border-emerald-500/50">
        <div className="pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-b from-emerald-500/10 via-transparent to-transparent opacity-0 transition group-focus-within:opacity-100" />
        <div className="relative flex items-center gap-2 border-b border-border/40 px-4 py-2.5">
          <Sparkles size={14} className="text-emerald-400" />
          <span className="font-mono text-[11px] text-muted-foreground">business.setup — your marketing dashboard</span>
        </div>
        <textarea
          name="productDescription"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Family-owned used car dealership in Austin — we specialize in trucks under $25k, want more Instagram foot traffic and weekend test drives…"
          rows={embedded ? 8 : 10}
          className="relative z-10 w-full resize-none rounded-b-xl bg-transparent px-5 py-4 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/50 focus:outline-none"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Business name">
          <input
            name="productName"
            value={productName}
            onChange={(e) => setProductName(e.target.value)}
            placeholder="Lone Star Auto"
            className="w-full rounded-lg border border-border/80 bg-zinc-950/40 px-3 py-2.5 text-sm backdrop-blur focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
          />
        </Field>
        <Field label="GitHub repo (optional)">
          <div className="relative">
            <Github size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              name="repoUrl"
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/you/repo"
              className="w-full rounded-lg border border-border/80 bg-zinc-950/40 py-2.5 pl-9 pr-3 text-sm backdrop-blur focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
        </Field>
      </div>

      <Field label="Launch goal">
        <div className="flex flex-wrap gap-2">
          {GOALS.map((g) => (
            <button
              key={g.id}
              type="button"
              onClick={() => setLaunchGoal(g.id)}
              className={`cursor-pointer rounded-full px-4 py-1.5 text-sm transition ${
                launchGoal === g.id
                  ? "bg-emerald-500 text-zinc-950 shadow-[0_0_20px_-6px_oklch(0.72_0.18_155)]"
                  : "border border-border/80 bg-zinc-950/30 text-muted-foreground hover:border-emerald-500/30 hover:text-foreground"
              }`}
            >
              {g.label}
            </button>
          ))}
          <input type="hidden" name="launchGoal" value={launchGoal} />
        </div>
      </Field>

      {error && <p className="text-center text-sm text-destructive">{error}</p>}
      {!canSubmit && trimmed.length > 0 && (
        <p className="text-center text-sm text-amber-400/90">
          Add {charsNeeded} more character{charsNeeded === 1 ? "" : "s"} ({trimmed.length}/{MIN_CHARS} min)
        </p>
      )}

      <button
        type="submit"
        className={`group relative z-30 mt-2 inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl px-5 py-4 text-sm font-semibold text-zinc-950 shadow-[0_0_40px_-10px_oklch(0.72_0.18_155)] transition hover:scale-[1.01] active:scale-[0.99] ${
          canSubmit && !submitting
            ? "bg-emerald-500 hover:opacity-95"
            : "bg-emerald-500/50 hover:bg-emerald-500/60"
        } ${submitting ? "pointer-events-none opacity-70" : ""}`}
      >
        <span className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition duration-700 group-hover:translate-x-full" />
        <span className="relative z-10 inline-flex items-center gap-2">
          {submitting ? (
            <>
              <Loader2 size={16} className="animate-spin" /> Building your dashboard…
            </>
          ) : (
            <>
              Build marketing dashboard <Rocket size={16} />
            </>
          )}
        </span>
      </button>
      <p className="text-center text-xs text-muted-foreground/60">
        ~3 min · AI suggests posts · you approve what publishes
      </p>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground">{label}</div>
      {children}
    </label>
  );
}
