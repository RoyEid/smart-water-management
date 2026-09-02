import { useCallback, useEffect, useState } from "react";
import {
  AlertTriangle,
  BellOff,
  CheckCheck,
  Info,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import Pagination from "../components/ui/Pagination";
import ConfirmDialog from "../components/ui/ConfirmDialog";
import { EmptyState, ErrorState, TableSkeleton } from "../components/ui/StateViews";
import {
  clearResolvedAlerts,
  fetchAlerts,
  markAlertRead,
  markAllAlertsRead,
} from "../services/alertApi";
import useAsyncData from "../hooks/useAsyncData";
import { useTelemetry } from "../context/TelemetryContext";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { getApiErrorMessage } from "../utils/apiError";
import { alertMessageKey } from "../utils/alertCatalog";
import { formatRelativeAge, formatTimestamp } from "../utils/telemetryFormat";
import sensorSocket, {
  acquireSensorSocket,
  releaseSensorSocket,
} from "../services/socket";

const SEVERITY_STYLES = {
  critical: {
    icon: ShieldAlert,
    chip: "bg-rose-100 text-rose-700 dark:bg-rose-950/70 dark:text-rose-300",
    accent: "border-s-4 border-s-rose-500",
  },
  warning: {
    icon: AlertTriangle,
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300",
    accent: "border-s-4 border-s-amber-500",
  },
  info: {
    icon: Info,
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-950/70 dark:text-cyan-300",
    accent: "border-s-4 border-s-sky-500",
  },
};

export default function AlertsPage() {
  const { t, language } = useLanguage();
  const { device } = useTelemetry();
  const toast = useToast();

  const [severity, setSeverity] = useState("");
  const [state, setState] = useState("");
  const [page, setPage] = useState(1);
  const [confirmClear, setConfirmClear] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  // Optimistic read-state overlay, applied on top of the fetched list so a
  // click responds instantly without waiting for a refetch.
  const [locallyRead, setLocallyRead] = useState(() => new Set());

  const loadAlerts = useCallback(() => {
    const params = { page, limit: 20 };
    if (severity) params.severity = severity;
    if (state) params.state = state;
    return fetchAlerts(params);
  }, [page, severity, state]);

  const { data, isLoading, error, retry, refresh } = useAsyncData(
    loadAlerts,
    [page, severity, state],
    { fallbackMessage: "Unable to load alerts." }
  );

  const rawAlerts = data?.alerts ?? [];
  const alerts = rawAlerts.map((alert) =>
    locallyRead.has(alert.id) ? { ...alert, isRead: true } : alert
  );
  const serverCounts = data?.counts ?? { unread: 0, active: 0 };
  const counts = {
    ...serverCounts,
    unread: Math.max(0, serverCounts.unread - locallyRead.size),
  };
  const pagination = data?.pagination ?? null;

  // Live updates use the shared socket. A new or resolved alert re-fetches the
  // current page rather than being spliced in, because what belongs on the page
  // the user is looking at depends on the active filters and the sort order.
  useEffect(() => {
    const handleChange = () => refresh();

    sensorSocket.on("alert:new", handleChange);
    sensorSocket.on("alert:resolved", handleChange);
    acquireSensorSocket();

    return () => {
      sensorSocket.off("alert:new", handleChange);
      sensorSocket.off("alert:resolved", handleChange);
      releaseSensorSocket();
    };
  }, [refresh]);

  const handleMarkRead = async (id) => {
    setLocallyRead((current) => new Set(current).add(id));

    try {
      await markAlertRead(id);
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Unable to mark the alert as read."));
      // Drop the optimistic overlay and take the server's answer instead.
      setLocallyRead(new Set());
      refresh();
    }
  };

  const handleMarkAllRead = async () => {
    try {
      const result = await markAllAlertsRead();
      toast.success(result.message || t("allMarkedRead"));
      setLocallyRead(new Set());
      refresh();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Unable to mark alerts as read."));
    }
  };

  const handleClearResolved = async () => {
    setIsClearing(true);
    try {
      const result = await clearResolvedAlerts(device?.deviceId ? { deviceId: device.deviceId } : undefined);
      toast.success(result.message || t("resolvedCleared"));
      setConfirmClear(false);
      setLocallyRead(new Set());
      setPage(1);
      refresh();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Unable to clear resolved alerts."));
    } finally {
      setIsClearing(false);
    }
  };

  const filterButton = (value, current, setter, label) => (
    <button
      key={label}
      type="button"
      onClick={() => {
        setter(value);
        setPage(1);
      }}
      aria-pressed={current === value}
      className={`shrink-0 rounded-xl px-3 py-1.5 text-[11px] font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
        current === value
          ? "bg-blue-600 text-white shadow-sm"
          : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:bg-slate-700"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            {t("diagnosticsAndSafety")}
          </p>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl dark:text-slate-100">
            {t("alerts")}
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {t("alertCounts", { active: counts.active, unread: counts.unread })}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleMarkAllRead}
            disabled={counts.unread === 0}
            className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
          >
            <CheckCheck size={14} aria-hidden="true" />
            {t("markAllRead")}
          </button>

          {/* Clearing resolved alerts is restricted to the device admin. */}
          {(device?.userRole === "admin" || device?.userRole === "owner") && (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-white px-4 text-xs font-bold text-rose-700 shadow-sm transition hover:bg-rose-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-rose-100 dark:border-rose-900/60 dark:bg-slate-800 dark:text-rose-300 dark:hover:bg-rose-950/40"
            >
              <Trash2 size={14} aria-hidden="true" />
              {t("clearResolved")}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="space-y-3 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div>
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("severity")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {filterButton("", severity, setSeverity, t("all"))}
            {filterButton("critical", severity, setSeverity, t("critical"))}
            {filterButton("warning", severity, setSeverity, t("warning"))}
            {filterButton("info", severity, setSeverity, t("info"))}
          </div>
        </div>

        <div>
          <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("stateFilter")}
          </p>
          <div className="flex flex-wrap gap-1.5">
            {filterButton("", state, setState, t("all"))}
            {filterButton("active", state, setState, t("active"))}
            {filterButton("resolved", state, setState, t("resolved"))}
            {filterButton("unread", state, setState, t("unread"))}
            {filterButton("read", state, setState, t("read"))}
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
        {isLoading && <TableSkeleton rows={5} columns={3} />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />
        )}

        {!isLoading && !error && alerts.length === 0 && (
          <EmptyState
            icon={BellOff}
            title={t("noAlertsTitle")}
            description={t("noAlertsDesc")}
          />
        )}

        {!isLoading && !error && alerts.length > 0 && (
          <>
            <ul className="space-y-3">
              {alerts.map((alert) => (
                <AlertRow
                  key={alert.id}
                  alert={alert}
                  onMarkRead={handleMarkRead}
                  t={t}
                  language={language}
                />
              ))}
            </ul>

            <div className="mt-5">
              <Pagination
                pagination={pagination}
                onPageChange={setPage}
                disabled={isLoading}
              />
            </div>
          </>
        )}
      </section>

      <ConfirmDialog
        open={confirmClear}
        title={t("clearResolvedTitle")}
        description={t("clearResolvedDesc")}
        confirmLabel={t("clearResolved")}
        cancelLabel={t("cancel")}
        loading={isClearing}
        onConfirm={handleClearResolved}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}

function AlertRow({ alert, onMarkRead, t, language }) {
  const style = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.info;
  const Icon = style.icon;
  const firstSeen = formatTimestamp(alert.firstSeenAt, { locale: language });
  const age = formatRelativeAge(alert.lastSeenAt, t);

  return (
    <li
      className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition dark:border-slate-800 dark:bg-slate-900 ${style.accent} ${
        alert.isResolved ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-start gap-3">
        <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${style.chip}`}>
          <Icon size={17} aria-hidden="true" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {t(alertMessageKey(alert.code))}
            </h3>
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${style.chip}`}>
              {t(alert.severity)}
            </span>
            {alert.isResolved ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300">
                {t("resolved")}
              </span>
            ) : (
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-extrabold uppercase text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                {t("active")}
              </span>
            )}
            {!alert.isRead && (
              <span className="size-1.5 rounded-full bg-blue-600 dark:bg-cyan-400" aria-label={t("unread")} />
            )}
          </div>

          <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
            {alert.message}
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-400 dark:text-slate-500">
            <span className="font-mono normal-case">{alert.deviceId}</span>
            {firstSeen.hasValue && <span>{firstSeen.text}</span>}
            {age && <span>{age}</span>}
            {/* An occurrence count above 1 is what deduplication looks like:
                one row that recurred, not many identical rows. */}
            {alert.occurrences > 1 && (
              <span>{t("occurrences", { count: alert.occurrences })}</span>
            )}
          </div>
        </div>

        {!alert.isRead && (
          <button
            type="button"
            onClick={() => onMarkRead(alert.id)}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-cyan-400 dark:hover:bg-blue-950/40"
          >
            {t("markRead")}
          </button>
        )}
      </div>
    </li>
  );
}
