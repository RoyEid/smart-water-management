import { Droplets, Gauge, Waves } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

// Physical upper-tank capacity. totalTransferredLitres is a per-session total,
// so it can never exceed what the destination tank holds. The firmware and
// backend already clamp; this guards the display against any stale value too.
const UPPER_TANK_CAPACITY_LITRES = 8.0;

/**
 * Presentation of the YF-S201 flow telemetry the backend serializes
 * (flowRateLMin / totalTransferredLitres) and streams over the existing
 * Socket.IO connection. Both values arrive as null until the flow sensor
 * reports, so each metric independently falls back to a placeholder instead
 * of assuming the whole card is empty or ready.
 */
function isPresent(value) {
  return typeof value === "number" && Number.isFinite(value);
}

function MetricBlock({ icon: Icon, label, value, unit, waiting, waitingLabel }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
        <Icon size={15} className="text-sky-500 dark:text-cyan-400" aria-hidden="true" />
        <span className="truncate">{label}</span>
      </div>
      {waiting ? (
        // Worded rather than "--": a dash next to a unit still reads like a
        // measurement that happens to be blank.
        <p className="mt-2 truncate text-xs font-bold text-slate-400 dark:text-slate-500">
          {waitingLabel}
        </p>
      ) : (
        <p className="mt-2 truncate text-3xl font-extrabold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
          {value}
          {unit && (
            <span className="ms-1 text-sm font-semibold text-slate-400 dark:text-slate-500">
              {unit}
            </span>
          )}
        </p>
      )}
    </div>
  );
}

export default function WaterFlowCard({
  flowRate,
  totalVolume,
  flowDataMode,
  isOnline = false,
}) {
  const { t } = useLanguage();

  const hasFlowRate = isPresent(flowRate);
  const hasTotalVolume = isPresent(totalVolume);
  const hasAnyData = hasFlowRate || hasTotalVolume;
  const isFlowing = isOnline && hasFlowRate && flowRate > 0;
  const isSimulated = flowDataMode === "simulated";

  // Bound the session total to the tank capacity so the UI can never render an
  // impossible over-capacity number.
  const clampedTotalVolume = hasTotalVolume
    ? Math.min(totalVolume, UPPER_TANK_CAPACITY_LITRES)
    : null;

  return (
    <article className="rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 sm:p-7">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            {t("waterFlow")}
          </p>
          <h3 className="mt-0.5 text-base font-extrabold text-slate-900 dark:text-slate-100">
            YF-S201 Flow Sensor
          </h3>
          {isSimulated && (
            <span className="mt-1.5 inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-700 dark:text-amber-400 ring-1 ring-amber-200/70 dark:ring-amber-800/60">
              <span className="size-1.5 rounded-full bg-amber-500" />
              {t("simulatedData")}
            </span>
          )}
        </div>
        <span
          className={`grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition-all duration-300 ${
            isFlowing
              ? "bg-cyan-500 text-white ring-cyan-300 shadow-md shadow-cyan-500/30"
              : "bg-cyan-50 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 ring-cyan-200/60 dark:ring-cyan-800/60"
          }`}
        >
          <Waves size={19} className={isFlowing ? "animate-pulse" : ""} aria-hidden="true" />
        </span>
      </div>

      {/* Metrics */}
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <MetricBlock
          icon={Gauge}
          label={t("currentFlowRate")}
          value={hasFlowRate ? flowRate.toFixed(1) : null}
          unit="L/min"
          waiting={!hasFlowRate}
          waitingLabel={t("waitingForData")}
        />
        <MetricBlock
          icon={Droplets}
          label={t("sessionTransferred")}
          value={hasTotalVolume ? clampedTotalVolume.toFixed(2) : null}
          unit="L"
          waiting={!hasTotalVolume}
          waitingLabel={t("waitingForData")}
        />
      </div>

      {/* Status footer */}
      <div className="mt-5 flex items-center gap-2 border-t border-slate-100/80 dark:border-slate-800/80 pt-4 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        {hasAnyData ? (
          <>
            <span
              className={`size-2 rounded-full ${
                isFlowing ? "bg-cyan-500 animate-pulse" : "bg-slate-300 dark:bg-slate-600"
              }`}
            />
            <span>{isFlowing ? t("telemetryLive") : t("waterFlow")}</span>
          </>
        ) : (
          <>
            <span className="size-2 rounded-full bg-slate-300 dark:bg-slate-600 animate-pulse" />
            <span>{t("waitingForData")}</span>
          </>
        )}
      </div>
    </article>
  );
}
