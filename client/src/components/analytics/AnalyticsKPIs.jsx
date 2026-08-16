import { Activity, Zap, Clock, TrendingUp } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function AnalyticsKPIs({ summary, tankCapacities }) {
  const { t } = useLanguage();

  const pumpRuntime = summary?.pumpRuntimeMinutes ?? 0;
  const dutyCycle = summary?.pumpDutyCyclePercent ?? 0;
  const dawleAvailability = summary?.dawleAvailabilityPercent ?? 0;
  const moteurRuntime = summary?.moteurRuntimePercent ?? 0;
  const flowActive = summary?.waterFlowActivePercent ?? 0;

  const upperAvg = summary?.waterLevels?.upper?.avg;
  const lowerAvg = summary?.waterLevels?.lower?.avg;

  return (
    <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* 1. Total Pump Active Runtime */}
      <div className="relative overflow-hidden rounded-3xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/10 via-slate-900/5 to-transparent p-5 shadow-sm backdrop-blur-xs transition hover:shadow-md dark:border-cyan-500/30 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
            {t("totalPumpRuntime") || "Total Pump Runtime"}
          </span>
          <span className="grid size-9 place-items-center rounded-2xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-400">
            <Clock size={18} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {pumpRuntime.toLocaleString()}
          </span>
          <span className="text-sm font-extrabold text-cyan-600 dark:text-cyan-400">Mins</span>
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          <TrendingUp size={13} className="text-cyan-500" />
          Capacities: {tankCapacities?.upperLiters ?? 1000}L / {tankCapacities?.lowerLiters ?? 1000}L
        </p>
      </div>

      {/* 2. Average Tank Levels */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 via-slate-900/5 to-transparent p-5 shadow-sm backdrop-blur-xs transition hover:shadow-md dark:border-indigo-500/30 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
            {t("avgWaterLevels") || "Average Fill Levels"}
          </span>
          <span className="grid size-9 place-items-center rounded-2xl bg-indigo-500/10 text-indigo-600 dark:bg-indigo-400/10 dark:text-indigo-400">
            <Activity size={18} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline justify-between gap-2">
          <div>
            <span className="text-xs font-extrabold text-slate-400">Upper: </span>
            <span className="text-2xl font-black text-cyan-600 dark:text-cyan-400">
              {upperAvg != null ? `${upperAvg.toFixed(1)}%` : "—"}
            </span>
          </div>
          <div>
            <span className="text-xs font-extrabold text-slate-400">Lower: </span>
            <span className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
              {lowerAvg != null ? `${lowerAvg.toFixed(1)}%` : "—"}
            </span>
          </div>
        </div>
        <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Flow Detection Activity: {flowActive.toFixed(1)}%
        </p>
      </div>

      {/* 3. Pump Runtime & Duty Cycle */}
      <div className="relative overflow-hidden rounded-3xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-slate-900/5 to-transparent p-5 shadow-sm backdrop-blur-xs transition hover:shadow-md dark:border-emerald-500/30 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
            {t("pumpDutyCycle") || "Pump Duty Cycle"}
          </span>
          <span className="grid size-9 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400">
            <Clock size={18} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {dutyCycle.toFixed(1)}%
          </span>
          <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">duty</span>
        </div>
        <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Total Runtime: {pumpRuntime.toFixed(1)} mins
        </p>
      </div>

      {/* 4. Dawle Grid Availability */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-slate-900/5 to-transparent p-5 shadow-sm backdrop-blur-xs transition hover:shadow-md dark:border-amber-500/30 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-600 dark:text-amber-400">
            {t("dawleAvailability") || "Dawle Grid Uptime"}
          </span>
          <span className="grid size-9 place-items-center rounded-2xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
            <Zap size={18} aria-hidden="true" />
          </span>
        </div>
        <div className="mt-3 flex items-baseline gap-2">
          <span className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            {dawleAvailability.toFixed(1)}%
          </span>
          <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400">grid</span>
        </div>
        <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
          Moteur / Outage Share: {moteurRuntime.toFixed(1)}%
        </p>
      </div>
    </section>
  );
}
