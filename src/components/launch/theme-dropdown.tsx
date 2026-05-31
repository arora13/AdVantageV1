import { useEffect, useState } from "react";
import { ChevronDown, Moon, Palette, Sun } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DEFAULT_THEME,
  THEME_LABELS,
  THEMES,
  type Theme,
  getStoredTheme,
  setTheme,
} from "@/lib/theme";

const THEME_ICONS: Record<Theme, typeof Moon> = {
  midnight: Moon,
  dark: Palette,
  light: Sun,
};

export function ThemeDropdown() {
  const [current, setCurrent] = useState<Theme>(DEFAULT_THEME);

  useEffect(() => {
    setCurrent(getStoredTheme());
  }, []);

  const Icon = THEME_ICONS[current];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-black/40 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition hover:border-emerald-500/30 hover:text-foreground"
          aria-label="Change theme"
        >
          <Icon size={13} className="text-emerald-400" />
          <span className="hidden sm:inline">{THEME_LABELS[current]}</span>
          <ChevronDown size={12} className="opacity-60" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[10rem]">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Theme</DropdownMenuLabel>
        <DropdownMenuRadioGroup
          value={current}
          onValueChange={(value) => {
            const theme = value as Theme;
            setTheme(theme);
            setCurrent(theme);
          }}
        >
          {THEMES.map((theme) => {
            const ItemIcon = THEME_ICONS[theme];
            return (
              <DropdownMenuRadioItem key={theme} value={theme} className="gap-2">
                <ItemIcon size={14} className="text-emerald-400" />
                {THEME_LABELS[theme]}
              </DropdownMenuRadioItem>
            );
          })}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
