import { Zap, Sliders } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function PowerAndModeBreakdown({ summary }) {
  const { t } = useLanguage();

  const powerDist = summary?.distribution?.powerSource;
  const modeDist = summary?.distribution?.pumpMode;

  const dawlePercent = powerDist?.dawlePercent ?? 0;
  const moteurPercent = powerDist?.moteurPercent ?? 0;

  const autoPercent = modeDist?.autoPercent ?? 100;
  const manualPercent = modeDist?.manualPercent ?? 0;

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Power Source Breakdown */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400">
              <Zap size={16} aria-hidden="true" />
            </span>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {t("powerSourceDistribution") || "Electricity Source Distribution"}
            </h4>
          </div>
          <span className="text-xs font-bold text-slate-400">GPIO 3 Dawle Sensor</span>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              style={{ width: `${dawlePercent}%` }}
              className="bg-emerald-500 transition-all duration-500"
              title={`Dawle: ${dawlePercent}%`}
            />
            <div
              style={{ width: `${moteurPercent}%` }}
              className="bg-amber-500 transition-all duration-500"
              title={`Moteur: ${moteurPercent}%`}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-3 dark:bg-emerald-950/20">
            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
              <span className="size-2 rounded-full bg-emerald-500" />
              <span>Dawle Grid: {dawlePercent}%</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Pumped on Dawle: {powerDist?.pumpOnDawleMinutes ?? 0} mins
            </p>
          </div>

          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/5 p-3 dark:bg-amber-950/20">
            <div className="flex items-center gap-1.5 font-bold text-amber-600 dark:text-amber-400">
              <span className="size-2 rounded-full bg-amber-500" />
              <span>Moteur / Outage: {moteurPercent}%</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Pumped on Moteur: {powerDist?.pumpOnMoteurMinutes ?? 0} mins
            </p>
          </div>
        </div>
      </div>

      {/* Pump Operating Modes & Safety Status */}
      <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-xl bg-cyan-500/10 text-cyan-600 dark:bg-cyan-400/10 dark:text-cyan-400">
              <Sliders size={16} aria-hidden="true" />
            </span>
            <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
              {t("pumpOperatingModes") || "Pump Modes & Safety Guard"}
            </h4>
          </div>
          <span className="text-xs font-bold text-slate-400">Auto vs Manual</span>
        </div>

        {/* Progress bar */}
        <div className="mt-4">
          <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
            <div
              style={{ width: `${autoPercent}%` }}
              className="bg-cyan-500 transition-all duration-500"
              title={`Auto: ${autoPercent}%`}
            />
            <div
              style={{ width: `${manualPercent}%` }}
              className="bg-indigo-500 transition-all duration-500"
              title={`Manual: ${manualPercent}%`}
            />
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/5 p-3 dark:bg-cyan-950/20">
            <div className="flex items-center gap-1.5 font-bold text-cyan-600 dark:text-cyan-400">
              <span className="size-2 rounded-full bg-cyan-500" />
              <span>AUTO Mode: {autoPercent}%</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              20% Start & 90% Stop thresholds
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-500/20 bg-indigo-500/5 p-3 dark:bg-indigo-950/20">
            <div className="flex items-center gap-1.5 font-bold text-indigo-600 dark:text-indigo-400">
              <span className="size-2 rounded-full bg-indigo-600" />
              <span>MANUAL Mode: {manualPercent}%</span>
            </div>
            <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
              Protected by dry-run & overflow interlocks
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
