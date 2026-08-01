import { useState } from "react";
import { Bell, Info, LoaderCircle } from "lucide-react";
import SettingsCard from "./SettingsCard";
import api from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../utils/apiError";

/**
 * These four toggles map one-to-one onto the fields the backend stores, so a
 * toggle shown here is a preference that genuinely persists — not a switch
 * that only moves. Email delivery is listed separately because the current
 * backend mailer only handles verification and password-reset messages.
 */
const TOGGLES = [
  { key: "pumpAlerts", labelKey: "pumpAlerts", descKey: "pumpAlertsDesc" },
  { key: "deviceOfflineAlerts", labelKey: "deviceOfflineAlerts", descKey: "deviceOfflineDesc" },
  { key: "safetyAlerts", labelKey: "safetyAlerts", descKey: "safetyAlertsDesc" },
];

export default function NotificationsSection() {
  const { t, dir } = useLanguage();
  const { user, applyUser } = useAuth();
  const toast = useToast();
  const isRtl = dir === "rtl";

  const [savingKey, setSavingKey] = useState(null);
  const prefs = user?.notificationPrefs ?? {};

  const toggle = async (key) => {
    const next = !prefs[key];
    setSavingKey(key);

    // Applied locally first so the switch responds immediately; the server
    // response then becomes the source of truth.
    applyUser({ notificationPrefs: { ...prefs, [key]: next } });

    try {
      const res = await api.patch("/auth/preferences", {
        notificationPrefs: { [key]: next },
      });
      applyUser(res.data.user);
    } catch (error) {
      // Reverted rather than left showing a state the server did not accept.
      applyUser({ notificationPrefs: { ...prefs, [key]: !next } });
      toast.error(getApiErrorMessage(error, t("preferenceSyncFailed")));
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <SettingsCard
      title={t("notifications")}
      description={t("configureAlertPrefs")}
      icon={Bell}
    >
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {TOGGLES.map((item) => (
          <ToggleRow
            key={item.key}
            item={item}
            checked={prefs[item.key] !== false}
            saving={savingKey === item.key}
            isRtl={isRtl}
            onToggle={() => toggle(item.key)}
            t={t}
          />
        ))}

        <ToggleRow
          item={{
            key: "emailNotifications",
            labelKey: "emailNotifications",
            descKey: "emailNotificationsDesc",
          }}
          checked={prefs.emailNotifications === true}
          saving={savingKey === "emailNotifications"}
          isRtl={isRtl}
          onToggle={() => toggle("emailNotifications")}
          t={t}
        />
      </div>

      {/* States plainly what each preference does today, so nothing here is
          claimed to work beyond what the backend actually implements. */}
      <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-slate-50 p-3.5 text-[11px] font-medium text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700/80">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        {t("notificationScopeNote")}
      </div>
    </SettingsCard>
  );
}

function ToggleRow({ item, checked, saving, isRtl, onToggle, t }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">
          {t(item.labelKey)}
        </p>
        <p className="text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
          {t(item.descKey)}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={t(item.labelKey)}
        disabled={saving}
        onClick={onToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:opacity-60 dark:focus-visible:ring-blue-900/30 ${
          checked ? "bg-blue-600 dark:bg-blue-500" : "bg-slate-200 dark:bg-slate-700"
        }`}
      >
        <span
          className={`inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked
              ? isRtl
                ? "-translate-x-6"
                : "translate-x-6"
              : isRtl
              ? "-translate-x-1"
              : "translate-x-1"
          }`}
        >
          {saving && (
            <LoaderCircle
              size={12}
              className="mx-auto mt-0.5 animate-spin text-blue-600"
              aria-hidden="true"
            />
          )}
        </span>
      </button>
    </div>
  );
}
