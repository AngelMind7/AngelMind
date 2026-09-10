import { useTheme, type Theme } from "@/contexts/ThemeContext";

const themes: Array<{ value: Theme; label: string }> = [
  { value: "dark", label: "Midnight" },
  { value: "obsidian", label: "Obsidian" },
  { value: "solarized", label: "Solarized" },
  { value: "cyberpunk", label: "Cyberpunk" },
  { value: "paper", label: "Paper" },
  { value: "high-contrast", label: "High contrast" },
];

export default function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  return <label className="flex items-center gap-2 text-xs text-muted-foreground"><span className="sr-only">Appearance theme</span><select aria-label="Appearance theme" value={theme} onChange={event => setTheme(event.target.value as Theme)} className="h-9 w-full border border-cyan-300/15 bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring">{themes.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>;
}
