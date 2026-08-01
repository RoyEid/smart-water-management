import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  ShieldAlert,
} from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { alertMessageKey } from "../../utils/alertCatalog";
import { formatRelativeAge } from "../../utils/telemetryFormat";
import { Skeleton } from "../ui/StateViews";

const SEVERITY_STYLES = {
  critical: {
    icon: ShieldAlert,
    border: "border-rose-200/90 bg-rose-50/80 text-rose-900 dark:border-rose-800/80 dark:bg-rose-950/40 dark:text-rose-200",
    iconBg: "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300",
  },
  warning: {
    icon: AlertTriangle,
    border: "border-amber-200/90 bg-amber-50/80 text-amber-900 dark:border-amber-800/80 dark:bg-amber-950/40 dark:text-amber-200",
    iconBg: "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300",
  },
  info: {
    icon: Info,
    border: "border-sky-200/90 bg-sky-50/80 text-sky-900 dark:border-sky-800/80 dark:bg-sky-950/40 dark:text-sky-200",
    iconBg: "bg-sky-100 text-sky-700 dark:bg-sky-950/80 dark:text-sky-300",
  },
};

/**
 * Shows the alerts the backend has actually raised.
 *
 * Previously this panel derived its own alert list from the current reading on
 * every render, which meant nothing was persisted, nothing could be marked
 * read, and the panel and the alerts page could disagree. It now renders the
 * same server-side alerts that feed the notification bell and /alerts.
 */
export default function AlertsPanel({ alerts = [], isLoading = false, limit = 4 }) {
  const { t } = useLanguage();

  const activeAlerts = alerts.filter((alert) => !alert.isResolved).slice(0, limit);

  return (
    <section className="group overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            {t("diagnosticsAndSafety")}
          </span>
          <h2 className="mt-0.5 truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl dark:text-slate-100">
            {t("systemNotices")}
          </h2>
        </div>
        <Link
          to="/alerts"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-cyan-400 dark:hover:bg-blue-950/40"
        >
          {t("viewAll")}
          <ArrowRight size={12} className="rtl:rotate-180" aria-hidden="true" />
        </Link>
      </div>

      <div className="mt-5 space-y-3" aria-live="polite">
        {isLoading && (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        )}

        {!isLoading && activeAlerts.length === 0 && (
          <div className="flex items-start gap-3.5 rounded-2xl border border-emerald-200/90 bg-emerald-50/80 p-4 text-emerald-900 dark:border-emerald-800/80 dark:bg-emerald-950/40 dark:text-emerald-200">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/80 dark:text-emerald-300">
              <CheckCircle2 size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-extrabold">{t("systemNominal")}</p>
              <p className="mt-1 text-xs font-semibold leading-relaxed opacity-90">
                {t("systemNominalDesc")}
              </p>
            </div>
          </div>
        )}

        {!isLoading &&
          activeAlerts.map((alert) => {
            const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
            const Icon = style.icon;
            const age = formatRelativeAge(alert.lastSeenAt, t);

            return (
              <div
                key={alert.id}
                className={`flex items-start gap-3.5 rounded-2xl border p-4 transition duration-300 ${style.border}`}
              >
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${style.iconBg}`}>
                  <Icon size={20} aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <p className="text-sm font-extrabold">{t(alertMessageKey(alert.code))}</p>
                    {age && (
                      <span className="text-[10px] font-bold uppercase tracking-wide opacity-70">
                        {age}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-xs font-semibold leading-relaxed opacity-90">
                    {alert.message}
                  </p>
                </div>
              </div>
            );
          })}
      </div>
    </section>
  );
}
