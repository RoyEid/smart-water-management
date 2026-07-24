import { Palette, Globe, Monitor, Sun, Moon, CheckCircle2 } from "lucide-react";
import SettingsCard from "./SettingsCard";
import { useTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";

export default function PreferencesSection() {
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();

  const themes = [
    { id: "system", labelKey: "system", icon: Monitor },
    { id: "light", labelKey: "light", icon: Sun },
    { id: "dark", labelKey: "dark", icon: Moon },
  ];

  const languages = [
    { id: "en", labelKey: "english" },
    { id: "ar", labelKey: "arabic" },
    { id: "fr", labelKey: "french" },
  ];

  return (
    <SettingsCard
      title={t("preferences")}
      description={t("customizeExperience")}
      icon={Palette}
    >
      {/* Theme */}
      <div className="mb-6">
        <p className="mb-3 text-xs font-extrabold text-slate-700 dark:text-slate-300">
          {t("theme")}
        </p>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {themes.map((tItem) => {
            const Icon = tItem.icon;
            const active = theme === tItem.id;
            return (
              <button
                key={tItem.id}
                type="button"
                aria-pressed={active}
                onClick={() => setTheme(tItem.id)}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                }`}
              >
                <Icon size={20} aria-hidden="true" />
                {t(tItem.labelKey)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Language */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <Globe size={14} className="text-slate-400 dark:text-slate-500" aria-hidden="true" />
          <p className="text-xs font-extrabold text-slate-700 dark:text-slate-300">
            {t("language")}
          </p>
        </div>
        <div className="grid grid-cols-3 gap-2 sm:gap-3">
          {languages.map((lItem) => {
            const active = language === lItem.id;
            return (
              <button
                key={lItem.id}
                type="button"
                aria-pressed={active}
                onClick={() => setLanguage(lItem.id)}
                className={`rounded-xl border p-2.5 text-xs font-bold transition focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 ${
                  active
                    ? "border-blue-500 bg-blue-50 text-blue-700 ring-2 ring-blue-200 dark:border-blue-500 dark:bg-blue-950/60 dark:text-blue-300 dark:ring-blue-800"
                    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700/80 dark:bg-slate-800/80 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800"
                }`}
              >
                {t(lItem.labelKey)}
              </button>
            );
          })}
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-emerald-200/80 bg-emerald-50/70 p-3.5 text-[11px] font-semibold text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
          <span>{t("langNote")}</span>
        </div>
      </div>
    </SettingsCard>
  );
}
