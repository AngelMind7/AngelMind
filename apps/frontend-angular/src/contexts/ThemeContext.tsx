import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark" | "obsidian" | "solarized" | "cyberpunk" | "paper" | "high-contrast";

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme?: () => void;
  switchable: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const THEME_KEY = "theme";

interface ThemeProviderProps { children: React.ReactNode; defaultTheme?: Theme; switchable?: boolean; }

export function ThemeProvider({ children, defaultTheme = "light", switchable = false }: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    if (!switchable) return defaultTheme;
    const stored = localStorage.getItem(THEME_KEY);
    return stored && ["light", "dark", "obsidian", "solarized", "cyberpunk", "paper", "high-contrast"].includes(stored) ? stored as Theme : defaultTheme;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", !["light", "paper"].includes(theme));
    if (switchable) localStorage.setItem(THEME_KEY, theme);
  }, [theme, switchable]);

  const toggleTheme = switchable ? () => setTheme(prev => prev === "light" || prev === "paper" ? "dark" : "light") : undefined;
  return <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, switchable }}>{children}</ThemeContext.Provider>;
}

export function useTheme() { const context = useContext(ThemeContext); if (!context) throw new Error("useTheme must be used within ThemeProvider"); return context; }
export type { Theme };
