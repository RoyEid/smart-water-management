import { useState } from "react";
import { BarChart2, Droplets } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function VolumeTransferredBarChart({ buckets = [], range = "24h" }) {
  const { t } = useLanguage();
  const [hoveredIndex, setHoveredIndex] = useState(null);

  const maxTransferred = Math.max(...buckets.map((b) => b.transferredLiters ?? 0), 10);

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
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
            {t("volumeTransferred") || "Volume Transferred (Liters)"}
          </span>
          <h3 className="mt-0.5 text-lg font-extrabold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2">
            Bucket Water Pumping Volume
            <BarChart2 size={18} className="text-emerald-600 dark:text-emerald-400" />
          </h3>
        </div>

        {hoveredBucket && (
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
            <Droplets size={14} />
            <span>
              {formatTimestamp(hoveredBucket.timestamp)}: {hoveredBucket.transferredLiters ?? 0} L ({hoveredBucket.pumpRuntimeMinutes ?? 0} mins)
            </span>
          </div>
        )}
      </div>

      {/* Bar Chart Graphics */}
      <div className="mt-6">
        <div className="flex h-48 items-end gap-1 sm:gap-2">
          {buckets.map((b, i) => {
            const val = b.transferredLiters ?? 0;
            const heightPercent = Math.min(100, Math.max(4, (val / maxTransferred) * 100));
            const isHovered = hoveredIndex === i;

            return (
              <div
                key={i}
                onMouseEnter={() => setHoveredIndex(i)}
                onMouseLeave={() => setHoveredIndex(null)}
                className="group relative flex flex-1 flex-col items-center h-full justify-end"
              >
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-lg transition-all duration-200 ${
                    val > 0
                      ? isHovered
                        ? "bg-emerald-400 shadow-md shadow-emerald-500/20"
                        : "bg-emerald-500/80 hover:bg-emerald-400"
                      : "bg-slate-200/60 dark:bg-slate-800/60"
                  }`}
                />
              </div>
            );
          })}
        </div>

        {/* X-Axis labels */}
        {buckets.length > 0 && (
          <div className="mt-3 flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500">
            <span>{formatTimestamp(buckets[0]?.timestamp)}</span>
            {buckets.length > 2 && <span>{formatTimestamp(buckets[Math.floor(buckets.length / 2)]?.timestamp)}</span>}
            <span>{formatTimestamp(buckets.at(-1)?.timestamp)}</span>
          </div>
        )}
      </div>
    </section>
  );
}
