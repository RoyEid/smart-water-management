import { useState } from "react";
import { Zap, ZapOff, CheckCircle2, ShieldAlert, LoaderCircle, AlertCircle } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import ConfirmDialog from "../ui/ConfirmDialog";

/**
 * Clean electricity-source status card displaying ONLY:
 *  - Dawle
 *  - Moteur
 *
 * When on Moteur, exposes the required "Allow Pump on Moteur" permission control.
 * Strictly no raw voltages, RMS, ADC values, or frequency displayed.
 */
export default function PowerSourceCard({
  powerSource = "MOTEUR",
  allowPumpOnMoteur = false,
  isOnline = false,
  updating = false,
  setAllowPumpOnMoteur,
}) {
  const { t } = useLanguage();
  const toast = useToast();
  const [pendingConfirm, setPendingConfirm] = useState(null);

  const isDawle = isOnline && powerSource === "DAWLE";
  const isMoteur = isOnline && powerSource === "MOTEUR";

  const handleTogglePermission = (targetAllow) => {
    if (!setAllowPumpOnMoteur) return;

    if (targetAllow) {
      setPendingConfirm({
        titleKey: "confirmAllowMoteurTitle",
        descriptionKey: "confirmAllowMoteurDesc",
        confirmKey: "allowPumpOnMoteur",
        destructive: false,
        action: async () => {
          const res = await setAllowPumpOnMoteur(true);
          if (res?.ok) toast.success(t("commandAllowMoteur"));
          else if (res?.message) toast.error(res.message);
        },
      });
    } else {
      setPendingConfirm({
        titleKey: "confirmDisallowMoteurTitle",
        descriptionKey: "confirmDisallowMoteurDesc",
        confirmKey: "disallowPumpOnMoteur",
        destructive: true,
        action: async () => {
          const res = await setAllowPumpOnMoteur(false);
          if (res?.ok) toast.success(t("commandDisallowMoteur"));
          else if (res?.message) toast.error(res.message);
        },
      });
    }
  };

  const handleConfirm = async () => {
    const config = pendingConfirm;
    setPendingConfirm(null);
    if (config?.action) {
      await config.action();
    }
  };

  const toneConfig = !isOnline
    ? {
        cardGlow: "border-slate-200/80 dark:border-slate-800",
        badgeBg: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 ring-slate-200 dark:ring-slate-700",
        iconBg: "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400 ring-slate-200 dark:ring-slate-700",
        dotBg: "bg-slate-400 dark:bg-slate-500",
        label: t("waitingForData"),
        desc: t("sensorOffline"),
      }
    : isDawle
    ? {
        cardGlow: "border-emerald-200/80 dark:border-emerald-800/60",
        badgeBg: "bg-emerald-500/10 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 ring-emerald-500/30",
        iconBg: "bg-emerald-500 text-white ring-emerald-300 shadow-lg shadow-emerald-500/25",
        dotBg: "bg-emerald-500 animate-pulse",
        label: t("dawle"),
        desc: t("powerSourceDawleDesc"),
      }
    : {
        cardGlow: "border-amber-200/80 dark:border-amber-800/60",
        badgeBg: "bg-amber-500/10 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 ring-amber-500/30",
        iconBg: "bg-amber-500 text-white ring-amber-300 shadow-lg shadow-amber-500/25",
        dotBg: "bg-amber-500 animate-pulse",
        label: t("moteur"),
        desc: t("powerSourceMoteurDesc"),
      };

  return (
    <article
      className={`rounded-3xl border bg-white/90 p-6 shadow-sm shadow-slate-900/5 sm:p-7 transition-all duration-300 dark:bg-slate-900/90 ${toneConfig.cardGlow}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            {t("powerSource")}
          </p>
          <h3 className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-slate-100">
            {t("powerSourceStatus")}
          </h3>
        </div>
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 transition-all duration-300 ${toneConfig.iconBg}`}
        >
          {isDawle ? (
            <Zap size={22} className="animate-pulse" aria-hidden="true" />
          ) : (
            <ZapOff size={22} aria-hidden="true" />
          )}
        </span>
      </div>

      {/* Main Electricity Source Display */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 sm:p-5 dark:border-slate-800/80 dark:bg-slate-950/40">
        <div className="flex items-center gap-3">
          <span className={`size-3 shrink-0 rounded-full ${toneConfig.dotBg}`} />
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t("powerSource")}
            </p>
            <p className="text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {toneConfig.label}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-extrabold ring-1 ${toneConfig.badgeBg}`}
          >
            {isDawle ? (
              <CheckCircle2 size={14} aria-hidden="true" />
            ) : (
              <AlertCircle size={14} aria-hidden="true" />
            )}
            {toneConfig.label}
          </span>
        </div>
      </div>

      <p className="mt-3 text-xs font-medium leading-relaxed text-slate-500 dark:text-slate-400">
        {toneConfig.desc}
      </p>

      {/* Moteur Permission Controls - Exclusively exposed when source is Moteur */}
      {isMoteur && (
        <div className="mt-5 border-t border-slate-100 pt-5 dark:border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">
                {t("moteurPumpPermission")}
              </h4>
              <p className="mt-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {allowPumpOnMoteur
                  ? t("moteurPermissionAllowed")
                  : t("moteurPermissionBlocked")}
              </p>
            </div>

            <div>
              {allowPumpOnMoteur ? (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleTogglePermission(false)}
                  className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-extrabold text-rose-700 transition hover:bg-rose-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 disabled:cursor-not-allowed disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-950/40 dark:text-rose-300 dark:hover:bg-rose-900/60"
                >
                  {updating ? (
                    <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <ShieldAlert size={14} aria-hidden="true" />
                  )}
                  <span>{t("disallowPumpOnMoteur")}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={updating}
                  onClick={() => handleTogglePermission(true)}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500 bg-emerald-600 px-3.5 py-2 text-xs font-extrabold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {updating ? (
                    <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
                  ) : (
                    <Zap size={14} aria-hidden="true" />
                  )}
                  <span>{t("allowPumpOnMoteur")}</span>
                </button>
              )}
            </div>
          </div>
          <p className="mt-2 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
            {t("moteurPumpPermissionDesc")}
          </p>
        </div>
      )}

      {/* Confirmation Dialog */}
      <ConfirmDialog
        open={Boolean(pendingConfirm)}
        title={pendingConfirm ? t(pendingConfirm.titleKey) : ""}
        description={pendingConfirm ? t(pendingConfirm.descriptionKey) : ""}
        confirmLabel={pendingConfirm ? t(pendingConfirm.confirmKey) : ""}
        cancelLabel={t("cancel")}
        destructive={pendingConfirm?.destructive !== false}
        loading={updating}
        onConfirm={handleConfirm}
        onCancel={() => setPendingConfirm(null)}
      />
    </article>
  );
}
