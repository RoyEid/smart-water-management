import { ArrowRight, Droplets, RotateCw } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

/**
 * The pump and the pipe between the two tanks.
 *
 * "Pumping" requires both a live device and a reported ON state — an ON status
 * from a reading that is now stale describes the past, not the present, and
 * animating the pipe for it would show water moving that is not moving.
 */
export default function WaterTransferVisual({ pumpStatus, pumpMode, isOnline = false }) {
  const { t } = useLanguage();

  const isPumping = isOnline && pumpStatus === "ON";
  // Distinguishes "reported OFF" from "never reported", which the previous
  // `pumpStatus = "OFF"` default silently collapsed into one.
  const knownPumpState = pumpStatus === "ON" || pumpStatus === "OFF";

  const modeLabel = pumpMode
    ? t(pumpMode === "MANUAL" ? "manual" : "auto")
    : t("notAvailable");

  let stateLabel = t("waitingForData");
  let stateClass = "text-slate-400 dark:text-slate-500";

  if (knownPumpState) {
    stateLabel = isPumping ? t("pumpingActive") : t("pumpStandby");
    stateClass = isPumping
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-slate-600 dark:text-slate-300";
  }

  return (
    <div className="flex flex-col items-center justify-center rounded-3xl border border-slate-200/80 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-center gap-2 text-center text-xs font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
        <Droplets size={14} className={isPumping ? "animate-bounce" : ""} aria-hidden="true" />
        {t("waterTransferSystem")}
      </div>

      <div className="relative my-4 flex w-full flex-col items-center justify-between gap-4 px-2 py-2 sm:px-4 lg:flex-row">
        <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="size-2.5 shrink-0 rounded-full bg-indigo-500" aria-hidden="true" />
          {t("lowerTankSource")}
        </div>

        <div className="relative flex min-h-[48px] w-full flex-1 items-center justify-center lg:min-h-0">
          <div
            className="absolute h-3 w-full overflow-hidden rounded-full bg-slate-200 shadow-inner dark:bg-slate-800"
            aria-hidden="true"
          >
            {isPumping && (
              <div className="h-full w-full animate-pulse bg-gradient-to-r from-indigo-500 via-sky-400 to-cyan-300 opacity-90" />
            )}
          </div>

          <div className="relative z-10 flex max-w-full items-center gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2.5 shadow-md sm:px-4 dark:border-slate-700 dark:bg-slate-800">
            <div
              className={`shrink-0 rounded-xl p-2.5 transition-all ${
                isPumping
                  ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30 ring-2 ring-emerald-300"
                  : "bg-slate-100 text-slate-400 dark:bg-slate-700"
              }`}
            >
              <RotateCw size={20} className={isPumping ? "animate-spin" : ""} aria-hidden="true" />
            </div>

            <div className="min-w-0">
              <p className="truncate text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {t("primaryTransferPump")}
              </p>
              <div className="flex flex-wrap items-center gap-x-2">
                <span className={`text-sm font-extrabold ${stateClass}`} aria-live="polite">
                  {stateLabel}
                </span>
                <span className="text-[10px] font-bold text-slate-400">({modeLabel})</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
          <span className="size-2.5 shrink-0 rounded-full bg-cyan-500" aria-hidden="true" />
          {t("upperTankDestination")}
        </div>
      </div>

      <div className="flex items-center gap-2 text-center text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        <ArrowRight
          size={14}
          className={`shrink-0 rtl:rotate-180 ${isPumping ? "animate-pulse text-cyan-500" : ""}`}
          aria-hidden="true"
        />
        <span>{t("flowDirection")}</span>
      </div>
    </div>
  );
}
