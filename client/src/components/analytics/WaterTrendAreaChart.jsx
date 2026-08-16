import { useState } from "react";
import { TrendingUp } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function WaterTrendAreaChart({ buckets = [], range = "24h" }) {
  const { t } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const totalPoints = Math.max(buckets.length - 1, 1);

  // Extract valid series
  const upperSeries = buckets.map((b, i) => ({ val: b.avgUpperLevel, index: i }));
  const lowerSeries = buckets.map((b, i) => ({ val: b.avgLowerLevel, index: i }));

  const buildPoints = (series) => {
    const valid = series.filter((p) => p.val != null);
    if (valid.length === 0) return "";
    return valid
      .map(
        (p) =>
          `${(p.index / totalPoints) * 100},${100 - Math.min(100, Math.max(0, p.val))}`
      )
      .join(" ");
  };

  const upperPoints = buildPoints(upperSeries);
  const lowerPoints = buildPoints(lowerSeries);

  const formatTimestamp = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    if (range === "24h") {
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    }
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const hoveredBucket = hoveredIndex !== null ? buckets[hoveredIndex] : null;

  return (
    <section className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            {t("trendProgression") || "Time-Series Aggregation"}
          </span>
          <h3 className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Water Level & Consumption Progression
            <TrendingUp size={18} className="text-cyan-600 dark:text-cyan-400" />
          </h3>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="flex items-center gap-1.5 text-cyan-600 dark:text-cyan-400">
            <span className="size-2.5 rounded-full bg-cyan-500" />
            <span>Upper Tank Avg</span>
          </div>
          <div className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400">
            <span className="size-2.5 rounded-full bg-indigo-600" />
            <span>Lower Tank Avg</span>
          </div>
        </div>
      </div>

      {/* Hover Information Banner */}
      <div className="mt-3 flex h-7 items-center justify-between rounded-xl bg-slate-50 px-3 text-xs font-semibold text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        {hoveredBucket ? (
          <>
            <span className="font-bold text-slate-900 dark:text-white">
              {formatTimestamp(hoveredBucket.timestamp)}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-cyan-600 dark:text-cyan-400">
                Upper: {hoveredBucket.avgUpperLevel != null ? `${hoveredBucket.avgUpperLevel}%` : "—"}
              </span>
              <span className="text-indigo-600 dark:text-indigo-400">
                Lower: {hoveredBucket.avgLowerLevel != null ? `${hoveredBucket.avgLowerLevel}%` : "—"}
              </span>
              <span className="text-emerald-600 dark:text-emerald-400">
                Pump Active: {hoveredBucket.pumpRuntimeMinutes ?? 0}m
              </span>
            </div>
          </>
        ) : (
          <span className="text-slate-400">Hover over any time point on the chart to inspect bucket metrics.</span>
        )}
      </div>

      {/* SVG Chart Graphic */}
      <div className="mt-4 grid grid-cols-[auto_1fr] gap-4">
        {/* Y-Axis */}
        <div className="flex h-56 flex-col justify-between text-[11px] font-bold text-slate-400 dark:text-slate-500">
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        {/* SVG Container */}
        <div className="relative h-56 min-w-0">
          <div className="absolute inset-x-0 top-0 border-t border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-x-0 top-1/4 border-t border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-x-0 top-2/4 border-t border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-x-0 top-3/4 border-t border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-x-0 bottom-0 border-t border-slate-200 dark:border-slate-700" />

          <svg
            className="h-full w-full overflow-visible"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="analyticsUpperGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.3" />
                <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="analyticsLowerGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Upper Polygon & Polyline */}
            {upperPoints && (
              <>
                <polygon fill="url(#analyticsUpperGrad)" points={`0,100 ${upperPoints} 100,100`} />
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

            {/* Lower Polygon & Polyline */}
            {lowerPoints && (
              <>
                <polygon fill="url(#analyticsLowerGrad)" points={`0,100 ${lowerPoints} 100,100`} />
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
          </svg>

          {/* Interactive invisible hover overlay columns */}
          <div className="absolute inset-0 flex">
            {buckets.map((b, i) => (
              <div
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="group relative flex-1 cursor-pointer hover:bg-cyan-500/5 dark:hover:bg-cyan-400/5 transition"
              >
                {hoveredIndex === i && (
                  <div className="absolute inset-y-0 left-1/2 w-0.5 -translate-x-1/2 bg-cyan-400/60" />
                )}
              </div>
            ))}
          </div>

          {buckets.length === 0 && (
            <div className="absolute inset-0 grid place-items-center">
              <p className="rounded-xl bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-400 backdrop-blur-sm dark:bg-slate-900/80 dark:text-slate-500">
                {t("noTelemetryInRange") || "No telemetry in selected range."}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* X-Axis labels */}
      {buckets.length > 0 && (
        <div className="mt-2 flex justify-between pl-8 pr-2 text-[10px] font-bold text-slate-400 dark:text-slate-500">
          <span>{formatTimestamp(buckets[0]?.timestamp)}</span>
          {buckets.length > 2 && <span>{formatTimestamp(buckets[Math.floor(buckets.length / 2)]?.timestamp)}</span>}
          <span>{formatTimestamp(buckets.at(-1)?.timestamp)}</span>
        </div>
      )}
    </section>
  );
}
