import { useEffect, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme, applyThemeToDocument } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

/**
 * Synchronizes user-specific preferences when authenticated and strictly
 * enforces light mode whenever the session is unauthenticated / logged out.
 */
export default function PreferenceSync() {
  const { user, isAuthenticated, status } = useAuth();
  const { theme, setTheme, forceLight } = useTheme();
  const { language, setLanguage } = useLanguage();

  const appliedForUserRef = useRef(null);

  useEffect(() => {
    // 1. Unauthenticated or Anonymous: Strictly enforce LIGHT mode
    if (!isAuthenticated || !user?.id || status === "anonymous") {
      appliedForUserRef.current = null;
      if (theme !== "light") {
        forceLight();
      } else {
        applyThemeToDocument(false);
      }
      return;
    }

    // 2. Authenticated user switch / initial login: Load this user's preferences
    if (appliedForUserRef.current === user.id) return;
    appliedForUserRef.current = user.id;

    const userTheme = user.preferences?.theme || "light";
    const userLanguage = user.preferences?.language || "en";

    if (userTheme !== theme) {
      setTheme(userTheme);
    }
    if (userLanguage && userLanguage !== language) {
      setLanguage(userLanguage);
    }
  }, [isAuthenticated, status, user, theme, language, setTheme, setLanguage, forceLight]);

  return null;
}
