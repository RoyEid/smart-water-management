import { Droplets, FlaskConical, Ruler, Waves } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import {
  formatNumber,
  formatVolume,
  hasValue,
  tankStatusKey,
} from "../../utils/telemetryFormat";

const STATUS_STYLES = {
  Empty: "bg-amber-50 text-amber-800 ring-amber-200/80 dark:bg-amber-950/80 dark:text-amber-300 dark:ring-amber-800/80",
  Low: "bg-amber-50 text-amber-800 ring-amber-200/80 dark:bg-amber-950/80 dark:text-amber-300 dark:ring-amber-800/80",
  Normal: "bg-emerald-50 text-emerald-800 ring-emerald-200/80 dark:bg-emerald-950/80 dark:text-emerald-300 dark:ring-emerald-800/80",
  High: "bg-cyan-50 text-cyan-800 ring-cyan-200/80 dark:bg-cyan-950/80 dark:text-cyan-300 dark:ring-cyan-800/80",
  Full: "bg-blue-50 text-blue-800 ring-blue-200/80 dark:bg-blue-950/80 dark:text-blue-300 dark:ring-blue-800/80",
  "Sensor Error": "bg-rose-50 text-rose-800 ring-rose-200/80 dark:bg-rose-950/80 dark:text-rose-300 dark:ring-rose-800/80",
};

/**
 * The tank column visual.
 *
 * When the level is unknown the column renders empty and greyed with an
 * explicit "waiting for data" caption — deliberately *not* at 0%, which would
 * be indistinguishable from a genuinely empty tank.
 */
export default function TankVisual({
  title,
  subtitle,
  tank,
  tankCapacity,
  pumpStatus,
  isOnline = false,
  isStale = false,
  lastUpdatedText,
  accent = "cyan",
}) {
  const { t } = useLanguage();

  const percentage = tank?.percentage;
  const knownLevel = hasValue(percentage);
  const clampedPercentage = knownLevel ? Math.max(0, Math.min(100, percentage)) : 0;

  const status = tank?.tankStatus ?? null;
  const statusKey = tankStatusKey(status);
  const statusLabel = statusKey ? t(statusKey) : t("waitingForData");

  const isSensorError = status === "Sensor Error";
  // The fluid is drawn in a neutral grey whenever the number behind it cannot
  // be trusted — a sensor fault, a stale reading, or no reading at all.
  const isDegraded = isSensorError || !knownLevel || isStale;

  const isPumpActive = pumpStatus === "ON" && isOnline;

  const distance = formatNumber(tank?.distanceCm, { decimals: 1, unit: "cm" });
  const waterHeight = formatNumber(tank?.waterHeightCm, { decimals: 1, unit: "cm" });
  const volume = formatVolume(percentage, { capacityLiters: tankCapacity });

  const badgeClass =
    STATUS_STYLES[status] ||
    "bg-slate-100 text-slate-700 ring-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700";

  return (
    <section className="group relative isolate flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="pointer-events-none absolute -right-24 -top-24 size-64 rounded-full bg-cyan-100/40 blur-3xl dark:bg-cyan-950/30" />
      <div className="pointer-events-none absolute -bottom-24 -left-20 size-64 rounded-full bg-blue-100/40 blur-3xl dark:bg-blue-950/30" />

      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <span className="block truncate text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
              {subtitle}
            </span>
            <h3 className="mt-0.5 truncate text-lg font-extrabold tracking-tight text-slate-900 sm:text-xl dark:text-slate-100">
              {title}
            </h3>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ring-1 transition-all sm:px-3 sm:text-xs ${badgeClass}`}
            >
              <span
                className={`size-2 rounded-full ${
                  status === "Low" || status === "Empty"
                    ? "animate-ping bg-amber-500"
                    : isSensorError
                    ? "bg-rose-500"
                    : status === "Full"
                    ? "bg-blue-500"
                    : knownLevel
                    ? "bg-emerald-500"
                    : "bg-slate-400"
                }`}
                aria-hidden="true"
              />
              {statusLabel}
            </span>
            <span className="hidden size-9 place-items-center rounded-xl bg-sky-50 text-sky-600 ring-1 ring-sky-100 sm:grid dark:bg-sky-950/80 dark:text-cyan-400 dark:ring-sky-900/60">
              <Droplets size={19} aria-hidden="true" />
            </span>
          </div>
        </div>

        {/* Tank column */}
        <div className="relative mx-auto my-6 flex h-64 items-center justify-center">
          {!isDegraded && (
            <div className="absolute size-48 animate-pulse rounded-full bg-cyan-400/15 blur-3xl" aria-hidden="true" />
          )}

          <div
            className="relative h-60 w-40 overflow-hidden rounded-b-[2.5rem] rounded-t-[1.5rem] border-[5px] border-slate-300/80 bg-slate-50/60 shadow-[inset_10px_0_20px_rgba(255,255,255,0.9),inset_-10px_0_20px_rgba(148,163,184,0.18),0_15px_30px_rgba(14,116,144,0.12)] sm:w-44 dark:border-slate-700/80 dark:bg-slate-800/40 dark:shadow-[inset_10px_0_20px_rgba(30,41,59,0.5),inset_-10px_0_20px_rgba(15,23,42,0.6),0_15px_30px_rgba(0,0,0,0.4)]"
            role="img"
            aria-label={
              knownLevel
                ? t("tankLevelAria", { title, level: clampedPercentage.toFixed(1) })
                : t("tankLevelUnknownAria", { title })
            }
          >
            <div className="pointer-events-none absolute inset-y-3 right-2.5 z-20 flex flex-col justify-between text-[9px] font-bold text-slate-400 dark:text-slate-500" aria-hidden="true">
              {["100%", "75%", "50%", "25%", "0%"].map((mark, index) => (
                <span key={mark} className="flex items-center gap-1">
                  <span
                    className={`h-0.5 bg-slate-300 dark:bg-slate-600 ${
                      index % 2 === 0 ? "w-2" : "w-1.5"
                    }`}
                  />
                  {mark}
                </span>
              ))}
            </div>

            {knownLevel ? (
              <div
                className={`absolute inset-x-0 bottom-0 overflow-hidden transition-[height] duration-1000 ease-out ${
                  isDegraded
                    ? "bg-gradient-to-t from-slate-400 to-slate-300 opacity-60 dark:from-slate-600 dark:to-slate-500"
                    : accent === "indigo"
                    ? "bg-gradient-to-t from-indigo-600 via-blue-500 to-cyan-400"
                    : "bg-gradient-to-t from-blue-600 via-sky-500 to-cyan-400"
                }`}
                style={{ height: `${clampedPercentage}%` }}
              >
                {!isDegraded && (
                  <>
                    <div className="absolute -left-6 -top-3 h-6 w-[200%] animate-wave-slow rounded-[50%] bg-cyan-200/80 opacity-80" aria-hidden="true" />
                    <div className="absolute -left-10 -top-2 h-5 w-[200%] animate-wave-fast rounded-[50%] bg-white/40 opacity-90" aria-hidden="true" />
                  </>
                )}

                {isPumpActive && !isDegraded && (
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 top-3" aria-hidden="true">
                    <span className="absolute left-4 size-2 animate-bubble-1 rounded-full bg-white/70" />
                    <span className="absolute right-6 size-1.5 animate-bubble-2 rounded-full bg-cyan-100/90" />
                  </div>
                )}

                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-black tabular-nums text-white drop-shadow-md">
                    {clampedPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>
            ) : (
              // No level reading: the column stays empty with an explicit
              // caption rather than being drawn at 0%.
              <div className="absolute inset-0 flex items-center justify-center px-4">
                <span className="text-center text-xs font-bold leading-relaxed text-slate-400 dark:text-slate-500">
                  {t("waitingForData")}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Readouts */}
        <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 p-3.5 sm:grid-cols-3 dark:border-slate-800 dark:bg-slate-800/50">
          <ReadoutCell
            icon={Ruler}
            iconClass="text-cyan-600 dark:text-cyan-400"
            label={t("distance")}
            formatted={distance}
          />
          <ReadoutCell
            icon={Waves}
            iconClass="text-blue-600 dark:text-blue-400"
            label={t("waterHeight")}
            formatted={waterHeight}
          />
          <ReadoutCell
            icon={FlaskConical}
            iconClass="text-indigo-600 dark:text-indigo-400"
            label={t("volume")}
            formatted={volume}
            className="col-span-2 sm:col-span-1"
          />
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-[11px] font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
        <div className="flex min-w-0 items-center gap-1.5">
          <span
            className={`size-2 shrink-0 rounded-full ${
              isSensorError
                ? "bg-rose-500"
                : isOnline
                ? "animate-pulse bg-emerald-500"
                : "bg-amber-500"
            }`}
            aria-hidden="true"
          />
          <span className="truncate">
            {isSensorError
              ? t("sensorFault")
              : isOnline
              ? t("sensorActive")
              : t("sensorOffline")}
          </span>
        </div>
        <span className="shrink-0 truncate text-slate-400 dark:text-slate-500">
          {lastUpdatedText}
        </span>
      </div>
    </section>
  );
}

function ReadoutCell({ icon: Icon, iconClass, label, formatted, className = "" }) {
  const { t } = useLanguage();

  const textToRender = formatted.hasValue
    ? formatted.text
    : formatted?.text && formatted.text !== "—"
    ? formatted.text === "Not configured"
      ? t("tankNotConfigured")
      : formatted.text
    : t("waitingForData");

  return (
    <div className={`min-w-0 ${className}`}>
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 dark:text-slate-400">
        <Icon size={13} className={iconClass} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </p>
      <p className="mt-0.5 truncate text-base font-extrabold tabular-nums text-slate-900 dark:text-slate-100">
        {formatted.hasValue ? (
          formatted.text
        ) : (
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
            {textToRender}
          </span>
        )}
      </p>
    </div>
  );
}
