import { Activity, WifiOff } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { formatTime } from "../../utils/telemetryFormat";

/**
 * Shared page heading with the live-connection pill.
 *
 * The pill distinguishes three states rather than two, because "the device is
 * quiet" and "the browser lost the server" are different problems with
 * different fixes, and a single "offline" badge would conflate them.
 */
export default function PageHeader({
  eyebrow,
  title,
  isOnline,
  isStale,
  socketConnected = true,
  lastUpdatedAt,
  actions,
}) {
  const { t, language } = useLanguage();
  const lastUpdated = formatTime(lastUpdatedAt, { locale: language });

  let statusKey = "telemetryLive";
  let statusTone = "text-emerald-600 dark:text-emerald-400";
  let dotClass = "animate-pulse bg-emerald-500";
  let StatusIcon = Activity;

  if (!socketConnected) {
    statusKey = "liveConnectionLost";
    statusTone = "text-rose-600 dark:text-rose-400";
    dotClass = "bg-rose-500";
    StatusIcon = WifiOff;
  } else if (isStale) {
    statusKey = "showingLastKnown";
    statusTone = "text-amber-600 dark:text-amber-400";
    dotClass = "bg-amber-500";
  } else if (!isOnline) {
    statusKey = "awaitingData";
    statusTone = "text-slate-500 dark:text-slate-400";
    dotClass = "bg-slate-400";
  }

  return (
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            {eyebrow}
          </p>
        )}
        <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl dark:text-slate-100">
          {title}
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {actions}
        <p
          className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-[11px] font-bold text-slate-600 shadow-sm sm:text-xs dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
          role="status"
          aria-live="polite"
        >
          <span className={`size-1.5 shrink-0 rounded-full ${dotClass}`} aria-hidden="true" />
          <StatusIcon size={13} className={`shrink-0 ${statusTone}`} aria-hidden="true" />
          <span className={`truncate ${statusTone}`}>{t(statusKey)}</span>
          {lastUpdated.hasValue && (
            <>
              <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
              <span className="shrink-0 tabular-nums">{lastUpdated.text}</span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
