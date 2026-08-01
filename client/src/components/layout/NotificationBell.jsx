import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Bell, CheckCheck, Info, ShieldAlert } from "lucide-react";
import useAlerts from "../../hooks/useAlerts";
import { useLanguage } from "../../context/LanguageContext";
import { formatRelativeAge } from "../../utils/telemetryFormat";
import { alertMessageKey } from "../../utils/alertCatalog";

const SEVERITY_STYLES = {
  critical: {
    icon: ShieldAlert,
    className: "bg-rose-100 text-rose-600 dark:bg-rose-950/80 dark:text-rose-400",
  },
  warning: {
    icon: AlertTriangle,
    className: "bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400",
  },
  info: {
    icon: Info,
    className: "bg-sky-100 text-sky-600 dark:bg-sky-950/80 dark:text-cyan-400",
  },
};

export default function NotificationBell() {
  const { alerts, unreadCount, isLoading, markRead, markAllRead } = useAlerts();
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const panelId = useId();
  const isRtl = dir === "rtl";

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  // Two digits max: a badge reading "137" would be wider than the bell.
  const badgeText = unreadCount > 99 ? "99+" : String(unreadCount);

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-controls={open ? panelId : undefined}
        aria-label={
          unreadCount > 0
            ? t("notificationsWithCount", { count: unreadCount })
            : t("notifications")
        }
        className="relative grid size-9 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 dark:focus-visible:ring-blue-900/30"
      >
        <Bell size={17} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className={`absolute -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-rose-600 px-1 text-[9px] font-extrabold text-white ring-2 ring-white dark:ring-slate-900 ${
              isRtl ? "-left-1.5" : "-right-1.5"
            }`}
            aria-hidden="true"
          >
            {badgeText}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label={t("notifications")}
          // Width is capped against the viewport so the panel never causes a
          // horizontal scrollbar on a small screen.
          className={`absolute top-12 z-50 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${
            isRtl ? "left-0" : "right-0"
          }`}
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
            <h2 className="text-xs font-extrabold text-slate-900 dark:text-slate-100">
              {t("notifications")}
            </h2>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-cyan-400 dark:hover:bg-blue-950/40"
              >
                <CheckCheck size={13} aria-hidden="true" />
                {t("markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {isLoading && (
              <p className="px-4 py-8 text-center text-xs font-bold text-slate-400">
                {t("loading")}
              </p>
            )}

            {!isLoading && alerts.length === 0 && (
              <div className="px-4 py-8 text-center">
                <Bell size={22} className="mx-auto text-slate-300 dark:text-slate-600" aria-hidden="true" />
                <p className="mt-2 text-xs font-bold text-slate-500 dark:text-slate-400">
                  {t("noNotifications")}
                </p>
              </div>
            )}

            {!isLoading &&
              alerts.map((alert) => {
                const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;
                const Icon = style.icon;
                const age = formatRelativeAge(alert.lastSeenAt, t);

                return (
                  <button
                    key={alert.id}
                    type="button"
                    onClick={() => !alert.isRead && markRead(alert.id)}
                    className={`flex w-full items-start gap-3 border-b border-slate-50 px-4 py-3 text-start transition last:border-b-0 hover:bg-slate-50 focus:outline-none focus-visible:bg-slate-50 dark:border-slate-800/60 dark:hover:bg-slate-800/60 dark:focus-visible:bg-slate-800/60 ${
                      alert.isRead ? "opacity-60" : ""
                    }`}
                  >
                    <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${style.className}`}>
                      <Icon size={15} aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-xs font-extrabold text-slate-800 dark:text-slate-100">
                          {t(alertMessageKey(alert.code))}
                        </span>
                        {!alert.isRead && (
                          <span className="size-1.5 shrink-0 rounded-full bg-blue-600 dark:bg-cyan-400" aria-hidden="true" />
                        )}
                      </span>
                      <span className="mt-0.5 block line-clamp-2 text-[11px] font-medium leading-relaxed text-slate-500 dark:text-slate-400">
                        {alert.message}
                      </span>
                      <span className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                        {age && <span>{age}</span>}
                        {alert.isResolved && (
                          <span className="text-emerald-600 dark:text-emerald-400">
                            {t("resolved")}
                          </span>
                        )}
                      </span>
                    </span>
                  </button>
                );
              })}
          </div>

          <div className="border-t border-slate-100 p-2 dark:border-slate-800">
            <Link
              to="/alerts"
              onClick={() => setOpen(false)}
              className="block rounded-xl px-3 py-2 text-center text-xs font-extrabold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-cyan-400 dark:hover:bg-blue-950/40"
            >
              {t("viewAllAlerts")}
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
