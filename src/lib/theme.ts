export const THEMES = ["midnight", "dark", "light"] as const;
export type Theme = (typeof THEMES)[number];

export const THEME_LABELS: Record<Theme, string> = {
  midnight: "Midnight",
  dark: "Dark",
  light: "Light",
};

export const THEME_STORAGE_KEY = "advantage-theme";
export const DEFAULT_THEME: Theme = "midnight";

export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-theme", theme);
  root.classList.toggle("dark", theme !== "light");
  root.style.colorScheme = theme === "light" ? "light" : "dark";
}

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return DEFAULT_THEME;
  const stored = localStorage.getItem(THEME_STORAGE_KEY);
  return THEMES.includes(stored as Theme) ? (stored as Theme) : DEFAULT_THEME;
}

export function setTheme(theme: Theme) {
  localStorage.setItem(THEME_STORAGE_KEY, theme);
  applyTheme(theme);
}

export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}")||"${DEFAULT_THEME}";var r=document.documentElement;r.setAttribute("data-theme",t);r.classList.toggle("dark",t!=="light");r.style.colorScheme=t==="light"?"light":"dark";}catch(e){document.documentElement.setAttribute("data-theme","${DEFAULT_THEME}");document.documentElement.classList.add("dark");}})();`;
