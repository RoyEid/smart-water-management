import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * Applies the preferences stored on the account once the user is known.
 *
 * Theme and language live in localStorage for instant application on first
 * paint (before any request resolves), and on the account so they follow the
 * user to another browser. This bridges the two: the account copy wins on
 * sign-in, then local changes are pushed back up by the settings page.
 *
 * Renders nothing — it exists only for the effect, and sits below AuthProvider
 * so it can read the user without the theme providers depending on auth.
 */
export default function PreferenceSync() {
  const { user, isAuthenticated } = useAuth();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage } = useLanguage();

  // Applied once per signed-in user. Without this guard, a user who switched
  // theme in this tab would have their stored preference re-applied on every
  // context update, undoing the change they just made.
  const appliedForUserRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.id) {
      appliedForUserRef.current = null;
      return;
    }

    if (appliedForUserRef.current === user.id) return;
    appliedForUserRef.current = user.id;

    const storedTheme = user.preferences?.theme;
    const storedLanguage = user.preferences?.language;

    if (storedTheme && storedTheme !== theme) setTheme(storedTheme);
    if (storedLanguage && storedLanguage !== language) setLanguage(storedLanguage);
  }, [isAuthenticated, user, theme, language, setTheme, setLanguage]);

  return null;
}
