import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { Header, Logo } from "@/components/launch/brand";
import {
  clearAuthUser,
  getAuthRedirectTarget,
  loadAuthUser,
  saveAuthUser,
  type AuthUser,
} from "@/lib/auth-session";
import { ArrowRight, Check, LogOut, Mail, Shield } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — AdVantage" },
      {
        name: "description",
        content: "Sign in to label your marketing workspace in this browser.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setUser(loadAuthUser());
  }, []);

  const finishSignIn = (nextUser: AuthUser) => {
    saveAuthUser(nextUser);
    setError(null);
    window.location.assign(getAuthRedirectTarget());
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !trimmedEmail.includes("@")) {
      setError("Enter a valid email for this workspace.");
      return;
    }
    finishSignIn({
      name: name.trim() || trimmedEmail.split("@")[0],
      email: trimmedEmail,
      provider: "workspace",
      signedInAt: Date.now(),
    });
  };

  const signOut = () => {
    clearAuthUser();
    setUser(null);
    setName("");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto grid min-h-screen max-w-6xl gap-10 px-6 pt-28 pb-16 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
        <section>
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1 text-xs uppercase tracking-[0.16em] text-emerald-300">
            <Shield size={13} /> Local workspace
          </div>
          <h1 className="mt-6 font-display text-5xl tracking-tight sm:text-6xl">
            Keep every launch tied to <span className="text-gradient">your team.</span>
          </h1>
          <p className="mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground">
            Enter your name and email — saved in this browser only. No password, no external
            account service.
          </p>
          <div className="mt-8 grid gap-3 text-sm text-muted-foreground">
            {[
              "Labels your session in the header",
              "Works offline after sign-in",
              "Takes you straight to the launch tool",
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <span className="grid size-6 place-items-center rounded-full bg-emerald-500/10 text-emerald-400">
                  <Check size={13} />
                </span>
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-border/70 bg-zinc-950/50 p-6 shadow-2xl backdrop-blur sm:p-8">
          <div className="flex items-center gap-3">
            <Logo size={36} />
            <div>
              <h2 className="font-display text-2xl tracking-tight">Sign in to AdVantage</h2>
              <p className="text-xs text-muted-foreground">Stored locally in this browser</p>
            </div>
          </div>

          {user ? (
            <div className="mt-8 space-y-5">
              <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/10 p-4">
                <div className="text-xs uppercase tracking-wider text-emerald-300">Signed in</div>
                <div className="mt-2 font-medium text-foreground">{user.name}</div>
                <div className="text-sm text-muted-foreground">{user.email}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/" })}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 hover:opacity-90"
                >
                  Set up a business <ArrowRight size={15} />
                </button>
                <button
                  type="button"
                  onClick={signOut}
                  className="inline-flex items-center gap-2 rounded-lg border border-border px-4 py-2.5 text-sm text-foreground hover:bg-zinc-900/70"
                >
                  <LogOut size={15} /> Sign out
                </button>
              </div>
            </div>
          ) : (
            <form className="mt-8 space-y-4" onSubmit={submit}>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted-foreground">Name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Arjun"
                  autoComplete="name"
                  className="w-full rounded-lg border border-border bg-background/70 px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs text-muted-foreground">Work email</span>
                <div className="relative">
                  <Mail
                    size={14}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@company.com"
                    autoComplete="email"
                    className="w-full rounded-lg border border-border bg-background/70 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
              </label>
              {error && (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <button
                type="submit"
                className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-semibold text-zinc-950 hover:opacity-90"
              >
                Continue to launch tool <ArrowRight size={15} />
              </button>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
