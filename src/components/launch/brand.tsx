import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogIn, UserCircle, Rocket } from "lucide-react";
import { ThemeDropdown } from "@/components/launch/theme-dropdown";
import { loadAuthUser, type AuthUser } from "@/lib/auth-session";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-md bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-[0_0_20px_-4px_oklch(0.72_0.18_155)]"
      style={{ width: size, height: size }}
    >
      <Rocket size={size * 0.55} className="text-zinc-950" strokeWidth={2.2} />
    </div>
  );
}

export function Header({ transparent = false }: { transparent?: boolean }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const sync = () => setUser(loadAuthUser());
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("advantage:auth-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("advantage:auth-changed", sync);
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 ${
        transparent
          ? "bg-gradient-to-b from-background/90 via-background/50 to-transparent backdrop-blur-md"
          : "border-b border-border/60 bg-background/80 backdrop-blur-md"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-6 py-4">
        <a href="/" className="flex min-w-0 items-center gap-3">
          <Logo />
          <div className="min-w-0">
            <span className="block font-display text-xl leading-none tracking-tight text-foreground">
              AdVantage
            </span>
            <span className="mt-0.5 hidden truncate text-[11px] text-muted-foreground sm:block">
              Marketing team at your fingertips
            </span>
          </div>
        </a>

        <nav className="hidden gap-6 text-sm text-muted-foreground lg:flex">
          <a href="/#intro" className="transition hover:text-foreground">
            Intro
          </a>
          <a href="/#tool" className="transition hover:text-emerald-400">
            Setup
          </a>
          <a href="/dashboard" className="transition hover:text-foreground">
            Dashboard
          </a>
          <a href="/#agents" className="transition hover:text-foreground">
            Agents
          </a>
          <Link to="/auth" className="transition hover:text-foreground">
            Account
          </Link>
        </nav>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <ThemeDropdown />
          <Link
            to="/auth"
            className="hidden items-center gap-1.5 rounded-full border border-border/70 px-3 py-1.5 text-sm text-muted-foreground transition hover:border-emerald-500/30 hover:text-foreground sm:inline-flex"
          >
            {user ? <UserCircle size={15} /> : <LogIn size={15} />}
            {user ? user.name : "Sign in"}
          </Link>
          <a
            href="/#tool"
            className="rounded-full bg-emerald-500 px-3.5 py-1.5 text-sm font-medium text-zinc-950 shadow-[0_0_20px_-8px_oklch(0.72_0.18_155)] transition hover:opacity-90 sm:px-4"
          >
            Open dashboard
          </a>
        </div>
      </div>
    </header>
  );
}
