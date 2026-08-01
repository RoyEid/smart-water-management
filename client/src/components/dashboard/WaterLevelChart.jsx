import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { hasValue } from "../../utils/telemetryFormat";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Recent telemetry as three series.
 *
 * A reading that did not include a level is skipped rather than plotted as 0 —
 * substituting zero would draw a line dropping to empty and read as a real
 * measurement of an empty tank. Each series keeps its own x-position so a gap
 * in one series does not shift the others.
 */
export default function WaterLevelChart({ readings = [] }) {
  const { t } = useLanguage();
  const [selectedSeries, setSelectedSeries] = useState("all"); // "all" | "upper" | "lower" | "pump"

  const total = Math.max(readings.length - 1, 1);

  const buildSeries = (extract) =>
    readings
      .map((item, index) => ({ value: extract(item), index }))
      .filter((point) => hasValue(point.value));

  const upperSeries = buildSeries((item) => item?.upperTank?.percentage);
  const lowerSeries = buildSeries((item) => item?.lowerTank?.percentage);
  // The pump series is derived from a reported ON/OFF, so a reading with no
  // pump status is skipped rather than drawn as OFF.
  const pumpSeries = buildSeries((item) =>
    item?.pumpStatus === "ON" ? 100 : item?.pumpStatus === "OFF" ? 0 : null
  );

  const buildPoints = (series) => {
    // A single point cannot form a polyline; it is rendered as a dot instead.
    if (series.length === 0) return "";
    return series
      .map(
        (point) =>
          `${(point.index / total) * 100},${100 - Math.min(100, Math.max(0, point.value))}`
      )
      .join(" ");
  };

  const upperPoints = buildPoints(upperSeries);
  const lowerPoints = buildPoints(lowerSeries);
  const pumpPoints = buildPoints(pumpSeries);

  const latestUpper = upperSeries.at(-1)?.value;
  const latestLower = lowerSeries.at(-1)?.value;
  const latestPump = readings.at(-1)?.pumpStatus ?? null;

  const hasAnyData = upperSeries.length > 0 || lowerSeries.length > 0;

  return (
    <section className="group overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            Historical Telemetry
          </span>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Multi-Series Water & Pump Stream
            <TrendingUp size={18} className="text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          </h2>
        </div>

        {/* Series Filter Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
          <button
            type="button"
            onClick={() => setSelectedSeries("all")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedSeries === "all"
                ? "bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Both Tanks
          </button>
          <button
            type="button"
            onClick={() => setSelectedSeries("upper")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedSeries === "upper"
                ? "bg-cyan-500 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Upper Tank
          </button>
          <button
            type="button"
            onClick={() => setSelectedSeries("lower")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedSeries === "lower"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Lower Tank
          </button>
          <button
            type="button"
            onClick={() => setSelectedSeries("pump")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              selectedSeries === "pump"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:text-slate-900"
            }`}
          >
            Pump History
          </button>
        </div>
      </div>

      {/* Legend & Current Indicators */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs font-semibold">
        {(selectedSeries === "all" || selectedSeries === "upper") && (
          <div className="flex items-center gap-2 text-cyan-600 dark:text-cyan-400 font-bold">
            <span className="size-2.5 rounded-full bg-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-800" />
            Upper Tank: {hasValue(latestUpper) ? `${latestUpper.toFixed(1)}%` : t("waitingForData")}
          </div>
        )}
        {(selectedSeries === "all" || selectedSeries === "lower") && (
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
            <span className="size-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-800" />
            Lower Tank: {hasValue(latestLower) ? `${latestLower.toFixed(1)}%` : t("waitingForData")}
          </div>
        )}
        {(selectedSeries === "all" || selectedSeries === "pump") && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800" />
            Pump State: {latestPump ?? t("waitingForData")}
          </div>
        )}
      </div>

      {/* Chart Graphic Area */}
      <div className="mt-6 grid grid-cols-[auto_1fr] gap-4">
        {/* Y-Axis scale */}
        <div className="flex h-56 flex-col justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* SVG Container */}
        <div className="relative h-56 min-w-0">
          {/* Subtle Horizontal Grid Lines */}
          <div className="absolute inset-x-0 top-0 border-t border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-x-0 top-1/4 border-t border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-x-0 top-2/4 border-t border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-x-0 top-3/4 border-t border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 dark:border-slate-700" />

          {/* SVG Trend Area */}
          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="upperGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lowerGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Upper Tank Series. Guarded on a non-empty series: an empty
                points attribute would render a stray shape at the origin. */}
            {(selectedSeries === "all" || selectedSeries === "upper") && upperPoints && (
              <>
                <polygon fill="url(#upperGradient)" points={`0,100 ${upperPoints} 100,100`} />
                <polyline
                  fill="none"
                  stroke="#06b6d4"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={upperPoints}
                />
              </>
            )}

            {/* Lower Tank Series */}
            {(selectedSeries === "all" || selectedSeries === "lower") && lowerPoints && (
              <>
                <polygon fill="url(#lowerGradient)" points={`0,100 ${lowerPoints} 100,100`} />
                <polyline
                  fill="none"
                  stroke="#4f46e5"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  points={lowerPoints}
                />
              </>
            )}

            {/* Pump Digital State Series */}
            {(selectedSeries === "all" || selectedSeries === "pump") && pumpPoints && (
              <polyline
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeDasharray="4 2"
                strokeLinecap="round"
                strokeLinejoin="round"
                points={pumpPoints}
              />
            )}
          </svg>

          {/* Nothing plotted yet: say so, rather than showing an empty grid
              that reads like a flat line at zero. */}
          {!hasAnyData && (
            <div className="absolute inset-0 grid place-items-center">
              <p className="rounded-xl bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-400 backdrop-blur-sm dark:bg-slate-900/80 dark:text-slate-500">
                {t("waitingForData")}
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
