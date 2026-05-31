export type AuthUser = {
  name: string;
  email: string;
  provider: "workspace";
  signedInAt: number;
};

const AUTH_KEY = "advantage:auth-user";

export function loadAuthUser(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthUser;
    if (!parsed.email || !parsed.name) return null;
    return { ...parsed, provider: "workspace" };
  } catch {
    return null;
  }
}

export function saveAuthUser(user: AuthUser): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
  window.dispatchEvent(new Event("advantage:auth-changed"));
}

export function clearAuthUser(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_KEY);
  window.dispatchEvent(new Event("advantage:auth-changed"));
}

export function getAuthRedirectTarget(): string {
  if (typeof window === "undefined") return "/";
  const next = new URLSearchParams(window.location.search).get("next")?.trim();
  if (!next || !next.startsWith("/") || next.startsWith("//")) return "/#tool";
  return next;
}
