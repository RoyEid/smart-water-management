import { Activity, TrendingUp } from "lucide-react";

export default function WaterLevelChart({ readings = [] }) {
  const values = readings.map((item) => item.percentage);
  const points = values.length
    ? values
        .map(
          (value, index) =>
            `${(index / Math.max(values.length - 1, 1)) * 100},${100 - value}`
        )
        .join(" ")
    : "0,100 100,100";
  const latest = values.at(-1);

  return (
    <section className="group overflow-hidden rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 p-6 shadow-sm shadow-slate-900/5 transition duration-300 hover:-translate-y-0.5 hover:shadow-xl sm:p-7">
      {/* Chart Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
            Historical Telemetry
          </span>
          <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Water Level Stream
            <TrendingUp size={18} className="text-cyan-600 dark:text-cyan-400" aria-hidden="true" />
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <span className="size-2.5 rounded-full bg-cyan-500 ring-2 ring-cyan-200 dark:ring-cyan-800" />
            Live %
          </div>

          <div className="rounded-2xl border border-sky-100 dark:border-sky-900/50 bg-gradient-to-br from-sky-50 to-blue-50/80 dark:from-sky-950/40 dark:to-blue-950/40 px-4 py-2 text-right">
            <p className="text-[10px] font-bold uppercase tracking-wider text-sky-600 dark:text-cyan-400">
              Current
            </p>
            <p className="text-xl font-extrabold text-blue-700 dark:text-cyan-300">
              {typeof latest === "number" ? `${latest.toFixed(1)}%` : "-- %"}
            </p>
          </div>
        </div>
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
              <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                <stop offset="100%" stopColor="#2563eb" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Gradient Fill Path */}
            <polygon
              fill="url(#chartGradient)"
              points={`0,100 ${points} 100,100`}
            />

            {/* Smooth Cyan Trend Line */}
            <polyline
              fill="none"
              stroke="#06b6d4"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
            />
          </svg>
        </div>
      </div>
    </section>
  );
}
