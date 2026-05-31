import { Link } from "@tanstack/react-router";

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <div
      className="grid place-items-center rounded-md bg-gradient-to-br from-primary to-accent shadow-[0_0_20px_-4px_var(--primary)]"
      style={{ width: size, height: size }}
    >
      <svg width={size * 0.6} height={size * 0.6} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="text-primary-foreground">
        <path d="M12 3v18" />
        <path d="M5 21h14" />
        <path d="M5 8h14" />
        <path d="M7 8l-3 7a4 4 0 0 0 8 0L9 8" />
        <path d="M17 8l-3 7a4 4 0 0 0 8 0l-3-7" />
      </svg>
    </div>
  );
}

export function Header({ transparent = false }: { transparent?: boolean }) {
  return (
    <header className={`relative z-20 ${transparent ? "" : "border-b border-border/60 bg-background/40 backdrop-blur"}`}>
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2.5">
          <Logo />
          <span className="font-display text-xl tracking-tight">Verdict</span>
        </Link>
        <nav className="hidden gap-7 text-sm text-muted-foreground md:flex">
          <a href="#how" className="hover:text-foreground transition">How it works</a>
          <a href="#lawyers" className="hover:text-foreground transition">For Lawyers</a>
        </nav>
        <div className="flex items-center gap-2">
          <button className="hidden text-sm text-muted-foreground hover:text-foreground sm:inline">Sign in</button>
          <Link
            to="/input"
            className="rounded-md bg-primary px-3.5 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
