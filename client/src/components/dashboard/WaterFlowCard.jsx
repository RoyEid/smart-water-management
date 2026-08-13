import { Waves, Activity, AlertCircle, Clock } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Binary water flow status card for YF-S201 flow sensor telemetry.
 * Displays exclusively one of four non-numeric states:
 *  - Water Flowing (active detection)
 *  - No Water Flow (confirmed no pulses)
 *  - Waiting for Data (online but missing/null telemetry)
 *  - Sensor Offline (device offline)
 */
export default function WaterFlowCard({ waterFlowDetected, isOnline = false }) {
  const { t } = useLanguage();

  let statusKey;
  let statusTone;
  let animateWave = false;

  if (!isOnline) {
    statusKey = "sensorOffline";
    statusTone = "offline";
  } else if (waterFlowDetected === true) {
    statusKey = "waterFlowing";
    statusTone = "flowing";
    animateWave = true;
  } else if (waterFlowDetected === false) {
    statusKey = "noWaterFlow";
    statusTone = "noflow";
  } else {
    statusKey = "waitingForData";
    statusTone = "waiting";
  }

  const TONE_CONFIGS = {
    flowing: {
      badgeBg: "bg-cyan-500/10 text-cyan-600 dark:bg-cyan-950/60 dark:text-cyan-300 ring-cyan-500/30",
      dotBg: "bg-cyan-500 animate-pulse",
      iconContainer: "bg-cyan-500 text-white ring-cyan-300 shadow-lg shadow-cyan-500/30",
      cardGlow: "border-cyan-200/80 dark:border-cyan-800/60",
    },
    noflow: {
      badgeBg: "bg-slate-100 text-slate-600 dark:bg-slate-800/80 dark:text-slate-400 ring-slate-200 dark:ring-slate-700",
      dotBg: "bg-slate-400 dark:bg-slate-500",
      iconContainer: "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 ring-slate-200 dark:ring-slate-700",
      cardGlow: "border-slate-200/80 dark:border-slate-800",
    },
    waiting: {
      badgeBg: "bg-sky-50 text-sky-600 dark:bg-sky-950/60 dark:text-sky-400 ring-sky-200 dark:ring-sky-800",
      dotBg: "bg-sky-400 animate-pulse",
      iconContainer: "bg-sky-50 dark:bg-sky-950/80 text-sky-500 ring-sky-200 dark:ring-sky-800",
      cardGlow: "border-slate-200/80 dark:border-slate-800",
    },
    offline: {
      badgeBg: "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400 ring-amber-200 dark:ring-amber-800",
      dotBg: "bg-amber-500",
      iconContainer: "bg-amber-50 dark:bg-amber-950/80 text-amber-500 ring-amber-200 dark:ring-amber-800",
      cardGlow: "border-slate-200/80 dark:border-slate-800",
    },
  };

  const currentTone = TONE_CONFIGS[statusTone];

  return (
    <article className={`rounded-3xl border bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 sm:p-7 transition-all duration-300 ${currentTone.cardGlow}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            {t("waterFlow")}
          </p>
          <h3 className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-slate-100">
            YF-S201 Flow Sensor
          </h3>
        </div>
        <span
          className={`grid size-11 shrink-0 place-items-center rounded-2xl ring-1 transition-all duration-300 ${currentTone.iconContainer}`}
        >
          <Waves size={22} className={animateWave ? "animate-pulse" : ""} aria-hidden="true" />
        </span>
      </div>

      {/* Main Binary Status Banner */}
      <div className="mt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-950/40 p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <span className={`size-3 shrink-0 rounded-full ${currentTone.dotBg}`} />
          <div>
            <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t("waterFlowStatus")}
            </p>
            <p className="text-xl font-black tracking-tight text-slate-900 dark:text-slate-100">
              {t(statusKey)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold ring-1 ${currentTone.badgeBg}`}>
            {statusTone === "flowing" && <Activity size={14} className="animate-spin" />}
            {statusTone === "waiting" && <Clock size={14} className="animate-pulse" />}
            {statusTone === "offline" && <AlertCircle size={14} />}
            {t(statusKey)}
          </span>
        </div>
      </div>

      {/* Footer info */}
      <div className="mt-4 flex items-center justify-between text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        <span>YF-S201 GPIO 18</span>
        <span>{isOnline ? t("telemetryLive") : t("sensorOffline")}</span>
      </div>
    </article>
  );
}
