import { CheckCircle2, Info, ShieldAlert, ShieldCheck, Zap } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";
import { derivePumpReasoning } from "../../utils/pumpReasoning";
import {
  PUMP_SAFETY_STOP_LOWER_LEVEL,
  PUMP_START_LOWER_MIN_LEVEL,
  PUMP_START_UPPER_LEVEL,
  PUMP_STOP_UPPER_LEVEL,
} from "../../utils/telemetryFormat";

const TONE_STYLES = {
  success: "border-emerald-200 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50/70 text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200",
  error: "border-rose-200 bg-rose-50/70 text-rose-900 dark:border-rose-800 dark:bg-rose-950/40 dark:text-rose-200",
  info: "border-sky-200 bg-sky-50/70 text-sky-900 dark:border-sky-800 dark:bg-sky-950/40 dark:text-sky-200",
};

const TONE_ICONS = {
  success: CheckCircle2,
  warning: Info,
  error: ShieldAlert,
  info: ShieldCheck,
};

/**
 * Explains the pump's current state in the user's language.
 *
 * The reasoning itself comes from the shared pumpReasoning module — this
 * component only renders it, so the dashboard and the pump control page can
 * never tell the user two different stories about the same reading.
 */
export default function AutoControlReasonCard({ reading, controlState, isOnline }) {
  const { t } = useLanguage();

  const reasoning = derivePumpReasoning({ reading, controlState, isOnline });
  const Icon = TONE_ICONS[reasoning.tone] ?? TONE_ICONS.info;
  const mode = controlState?.pumpMode ?? reading?.pumpMode ?? null;

  return (
    <div className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-3">
        <h3 className="flex min-w-0 items-center gap-2 text-sm font-extrabold text-slate-900 dark:text-slate-100">
          <Zap size={16} className="shrink-0 text-sky-600 dark:text-cyan-400" aria-hidden="true" />
          <span className="truncate">{t("automaticControlReasoning")}</span>
        </h3>
        <span className="shrink-0 rounded-full bg-sky-100 px-3 py-1 text-[11px] font-bold text-sky-700 dark:bg-sky-950 dark:text-cyan-300">
          {mode
            ? t("modeLabel", { mode: t(mode === "MANUAL" ? "manual" : "auto") })
            : t("notAvailable")}
        </span>
      </div>

      {/* The thresholds the firmware actually applies, stated so the reasoning
          below is checkable rather than merely asserted. */}
      <div className="mt-4 grid grid-cols-1 gap-2 border-b border-slate-100 pb-3 text-[11px] font-semibold text-slate-500 sm:grid-cols-3 dark:border-slate-800 dark:text-slate-400">
        <RuleChip
          color="bg-emerald-500"
          text={t("ruleStart", {
            upper: PUMP_START_UPPER_LEVEL,
            lower: PUMP_START_LOWER_MIN_LEVEL,
          })}
        />
        <RuleChip color="bg-blue-500" text={t("ruleStop", { upper: PUMP_STOP_UPPER_LEVEL })} />
        <RuleChip
          color="bg-rose-500"
          text={t("ruleSafety", { lower: PUMP_SAFETY_STOP_LOWER_LEVEL })}
        />
      </div>

      <div
        className={`mt-4 flex items-start gap-3 rounded-2xl border p-4 transition-all ${
          TONE_STYLES[reasoning.tone] ?? TONE_STYLES.info
        }`}
        // The reason changes as the hardware state changes, and that change is
        // the point of the card — it is announced rather than only shown.
        role="status"
        aria-live="polite"
      >
        <Icon size={20} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p className="text-xs font-bold leading-relaxed">
          {t(reasoning.key, reasoning.params)}
        </p>
      </div>
    </div>
  );
}

function RuleChip({ color, text }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`size-1.5 shrink-0 rounded-full ${color}`} aria-hidden="true" />
      <span className="truncate">{text}</span>
    </div>
  );
}
