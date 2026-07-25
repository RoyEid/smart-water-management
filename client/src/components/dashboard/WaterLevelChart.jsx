import { useState } from "react";
import { Activity, RotateCw, TrendingUp, Waves } from "lucide-react";

export default function WaterLevelChart({ readings = [] }) {
  const [selectedSeries, setSelectedSeries] = useState("all"); // "all" | "upper" | "lower" | "pump"

  const upperValues = readings.map((item) => item?.upperTank?.percentage ?? 0);
  const lowerValues = readings.map((item) => item?.lowerTank?.percentage ?? 0);
  const pumpValues = readings.map((item) => (item?.pumpStatus === "ON" ? 100 : 0));

  const buildPoints = (values) => {
    if (!values || values.length === 0) return "0,100 100,100";
    return values
      .map(
        (val, index) =>
          `${(index / Math.max(values.length - 1, 1)) * 100},${100 - Math.min(100, Math.max(0, val))}`
      )
      .join(" ");
  };

  const upperPoints = buildPoints(upperValues);
  const lowerPoints = buildPoints(lowerValues);
  const pumpPoints = buildPoints(pumpValues);

  const latestUpper = upperValues.at(-1);
  const latestLower = lowerValues.at(-1);
  const latestPump = readings.at(-1)?.pumpStatus || "OFF";

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
            Upper Tank: {typeof latestUpper === "number" ? `${latestUpper.toFixed(1)}%` : "--"}
          </div>
        )}
        {(selectedSeries === "all" || selectedSeries === "lower") && (
          <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold">
            <span className="size-2.5 rounded-full bg-indigo-600 ring-2 ring-indigo-200 dark:ring-indigo-800" />
            Lower Tank: {typeof latestLower === "number" ? `${latestLower.toFixed(1)}%` : "--"}
          </div>
        )}
        {(selectedSeries === "all" || selectedSeries === "pump") && (
          <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
            <span className="size-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-800" />
            Pump State: {latestPump}
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

            {/* Upper Tank Series */}
            {(selectedSeries === "all" || selectedSeries === "upper") && (
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
            {(selectedSeries === "all" || selectedSeries === "lower") && (
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
            {(selectedSeries === "all" || selectedSeries === "pump") && (
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
        </div>
      </div>
    </section>
  );
}
