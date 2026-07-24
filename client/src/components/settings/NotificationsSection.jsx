import { useState, useEffect } from "react";
import { Bell, Info } from "lucide-react";
import SettingsCard from "./SettingsCard";
import { useLanguage } from "../../context/LanguageContext";

const STORAGE_KEY = "smart_water_notifications";

const defaultPrefs = {
  tankFull: true,
  tankLow: true,
  pumpStartStop: true,
  deviceOffline: true,
  sensorError: true,
  emailNotifications: false,
};

export default function NotificationsSection() {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";

  const toggles = [
    { key: "tankFull", labelKey: "tankFullAlerts", descKey: "tankFullDesc" },
    { key: "tankLow", labelKey: "tankLowAlerts", descKey: "tankLowDesc" },
    { key: "pumpStartStop", labelKey: "pumpStartStopAlerts", descKey: "pumpStartStopDesc" },
    { key: "deviceOffline", labelKey: "deviceOfflineAlerts", descKey: "deviceOfflineDesc" },
    { key: "sensorError", labelKey: "sensorErrorAlerts", descKey: "sensorErrorDesc" },
    { key: "emailNotifications", labelKey: "emailNotifications", descKey: "emailNotificationsDesc" },
  ];

  const [prefs, setPrefs] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored ? { ...defaultPrefs, ...stored } : defaultPrefs;
    } catch {
      return defaultPrefs;
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  }, [prefs]);

  function toggle(key) {
    setPrefs((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <SettingsCard
      title={t("notifications")}
      description={t("configureAlertPrefs")}
      icon={Bell}
    >
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {toggles.map((item) => (
          <div key={item.key} className="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
            <div className="min-w-0 pr-4 rtl:pr-0 rtl:pl-4">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{t(item.labelKey)}</p>
              <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{t(item.descKey)}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={prefs[item.key]}
              aria-label={t(item.labelKey)}
              onClick={() => toggle(item.key)}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 ${
                prefs[item.key] ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
              }`}
            >
              <span
                className={`inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                  prefs[item.key]
                    ? isRtl
                      ? "-translate-x-6"
                      : "translate-x-6"
                    : isRtl
                    ? "-translate-x-1"
                    : "translate-x-1"
                }`}
              />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 ring-1 ring-slate-200/80 dark:ring-slate-700/80">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        {t("notifNote")}
      </div>
    </SettingsCard>
  );
}
