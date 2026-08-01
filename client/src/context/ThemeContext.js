import { createContext, useContext } from "react";

export const THEME_KEY = "smart_water_theme";
export const THEME_OPTIONS = ["system", "light", "dark"];

/**
 * Context and hook live in a plain module, separate from the provider
 * component, so the provider file exports only components — which is what
 * react-refresh needs to hot-reload it reliably.
 */
export const ThemeContext = createContext(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}

/**
 * Applies the resolved theme to the document.
 *
 * `colorScheme` is set alongside the class so native form controls and
 * scrollbars follow the theme too, not just the Tailwind-styled surfaces.
 */
export function applyThemeToDocument(isDark) {
  const root = document.documentElement;
  root.classList.toggle("dark", isDark);
  root.style.colorScheme = isDark ? "dark" : "light";
}

export function readStoredTheme() {
  const stored = localStorage.getItem(THEME_KEY);
  return THEME_OPTIONS.includes(stored) ? stored : "system";
}

export function systemPrefersDark() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function resolveIsDark(theme, prefersDark) {
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return prefersDark;
}
