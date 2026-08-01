import { useCallback, useEffect, useMemo, useState } from "react";
import {
  applyThemeToDocument,
  readStoredTheme,
  resolveIsDark,
  systemPrefersDark,
  ThemeContext,
  THEME_KEY,
} from "./ThemeContext";

/**
 * Owns theme selection and applies it to the document immediately.
 *
 * `isDark` is derived during render from (theme, prefersDark) rather than held
 * in its own state and synced by an effect — a derived value stored in state
 * is a second source of truth that can disagree with the first for a frame.
 * The only state here is the user's choice and the OS preference, which is a
 * genuine external subscription.
 */
export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(readStoredTheme);
  const [prefersDark, setPrefersDark] = useState(systemPrefersDark);

  const isDark = resolveIsDark(theme, prefersDark);

  // Applied during layout rather than after paint, so switching theme does not
  // flash the previous colours for a frame.
  useEffect(() => {
    applyThemeToDocument(isDark);
  }, [isDark]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (event) => setPrefersDark(event.matches);

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  const setTheme = useCallback((newTheme) => {
    setThemeState(newTheme);
    // Written immediately so the choice survives a refresh even if the
    // account-level save that follows fails or the user is signed out.
    localStorage.setItem(THEME_KEY, newTheme);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, isDark }),
    [theme, setTheme, isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export default ThemeProvider;
