import { useCallback, useEffect, useMemo, useState } from "react";
import { translations } from "../locales/translations";
import {
  applyLanguageToDocument,
  directionFor,
  LanguageContext,
  LANG_KEY,
  readStoredLanguage,
} from "./LanguageContext";

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(readStoredLanguage);

  // Derived, not stored: direction is a pure function of the language, and
  // keeping it in state would allow the two to disagree.
  const dir = directionFor(language);

  useEffect(() => {
    applyLanguageToDocument(language);
  }, [language]);

  const setLanguage = useCallback((newLanguage) => {
    setLanguageState(newLanguage);
    localStorage.setItem(LANG_KEY, newLanguage);
  }, []);

  /**
   * Looks up a key, falling back to English and finally to the key itself so a
   * missing translation degrades to readable text rather than a blank.
   * `{name}` placeholders are substituted from `params`.
   */
  const translate = useCallback(
    (key, params = {}) => {
      const dictionary = translations[language] || translations.en;
      let text = dictionary[key] ?? translations.en[key] ?? key;

      for (const [paramKey, value] of Object.entries(params)) {
        text = text.split(`{${paramKey}}`).join(String(value));
      }

      return text;
    },
    [language]
  );

  const value = useMemo(
    () => ({ language, setLanguage, t: translate, dir, isRtl: dir === "rtl" }),
    [language, setLanguage, translate, dir]
  );

  return (
    <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
  );
}

export default LanguageProvider;
