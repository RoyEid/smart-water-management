import { CheckCircle2, CircleHelp, Cpu, RotateCw, ShieldCheck, XCircle } from "lucide-react";
import DeviceControlPanel from "../components/dashboard/DeviceControlPanel";
import PageHeader from "../components/dashboard/PageHeader";
import Readout from "../components/dashboard/Readout";
import { CardSkeleton, EmptyState } from "../components/ui/StateViews";
import useDeviceControl from "../hooks/useDeviceControl";
import { useTelemetry } from "../context/TelemetryContext";
import { useLanguage } from "../context/LanguageContext";
import { derivePumpReasoning, deriveSafetyChecks } from "../utils/pumpReasoning";
import { formatPercentage } from "../utils/telemetryFormat";

const CHECK_ICONS = {
  pass: { icon: CheckCircle2, className: "text-emerald-600 dark:text-emerald-400" },
  fail: { icon: XCircle, className: "text-rose-600 dark:text-rose-400" },
  unknown: { icon: CircleHelp, className: "text-slate-400 dark:text-slate-500" },
};

export default function PumpControlPage() {
  const { reading, device, isOnline, isStale, isLoading, socketConnected, lastUpdatedAt } =
    useTelemetry();
  const {
    controlState,
    loading: controlLoading,
    updating,
    error: controlError,
    lastCommand,
    toggleSystemEnabled,
    setPumpMode,
    setManualPumpState,
    setAllowPumpOnMoteur,
  } = useDeviceControl();
  const { t } = useLanguage();

  const reasoning = derivePumpReasoning({ reading, controlState, isOnline });
  const safetyChecks = deriveSafetyChecks({ reading, controlState, isOnline });

  const pumpStatus = reading?.pumpStatus ?? null;
  const isPumping = isOnline && pumpStatus === "ON";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("remoteActuation")}
        title={t("pumpOperatingModeAndControls")}
        isOnline={isOnline}
        isStale={isStale}
        socketConnected={socketConnected}
        lastUpdatedAt={lastUpdatedAt}
      />

      {!isLoading && !device ? (
        <EmptyState
          icon={Cpu}
          title={t("noDeviceAssignedTitle")}
          description={t("noDeviceAssignedDesc")}
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {controlLoading ? (
            <CardSkeleton rows={6} />
          ) : (
            <DeviceControlPanel
              controlState={controlState}
              reading={reading}
              updating={updating}
              loading={controlLoading}
              error={controlError}
              lastCommand={lastCommand}
              isOnline={isOnline}
              toggleSystemEnabled={toggleSystemEnabled}
              setPumpMode={setPumpMode}
              setManualPumpState={setManualPumpState}
              setAllowPumpOnMoteur={setAllowPumpOnMoteur}
            />
          )}
        </div>

        <div className="space-y-6">
          {/* Live hardware state, as distinct from the requested control state
              above — the two can legitimately differ while a command is in
              flight or a safety interlock is holding the pump. */}
          <article className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 dark:border-slate-800 dark:bg-slate-900/90">
            <div className="flex items-center justify-between gap-3">
              <h3 className="min-w-0 truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {t("pumpHardwareTelemetry")}
              </h3>
              <span
                className={`shrink-0 rounded-xl p-2 ${
                  isPumping
                    ? "bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-400 dark:ring-emerald-800"
                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                }`}
              >
                <RotateCw
                  size={18}
                  className={isPumping ? "animate-spin" : ""}
                  aria-hidden="true"
                />
              </span>
            </div>

            <div className="mt-4">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {t("currentPumpState")}
              </p>
              {isLoading ? (
                <p className="mt-1 text-xs font-bold text-slate-400">{t("loading")}</p>
              ) : (
                <p
                  className={`mt-1 text-xl font-extrabold sm:text-2xl ${
                    isPumping
                      ? "text-emerald-600 dark:text-emerald-400"
                      : pumpStatus === "OFF"
                      ? "text-slate-700 dark:text-slate-200"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                  aria-live="polite"
                >
                  {pumpStatus === "ON"
                    ? isOnline
                      ? t("activelyPumping")
                      : t("lastReportedOn")
                    : pumpStatus === "OFF"
                    ? t("pumpStopped")
                    : t("waitingForData")}
                </p>
              )}
            </div>

            <dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
              <TelemetryRow
                label={t("upperTankLevel")}
                formatted={formatPercentage(reading?.upperTank?.percentage)}
              />
              <TelemetryRow
                label={t("lowerTankLevel")}
                formatted={formatPercentage(reading?.lowerTank?.percentage)}
              />
            </dl>

            <dl className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs font-medium text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <HardwareRow label={t("relayOutputPin")} value="GPIO 4" mono />
              <HardwareRow label={t("relayLogic")} value={t("activeLow")} mono />
              <HardwareRow
                label={t("powerSource")}
                value={
                  reading?.powerSource
                    ? reading.powerSource === "DAWLE"
                      ? t("dawle")
                      : t("moteur")
                    : t("waitingForData")
                }
                highlight
              />
              <HardwareRow
                label={t("controlMode")}
                value={
                  controlState.pumpMode
                    ? t(controlState.pumpMode === "MANUAL" ? "manual" : "auto")
                    : t("waitingForData")
                }
                highlight
              />
              <HardwareRow
                label={t("systemState")}
                value={
                  controlState.systemEnabled === undefined
                    ? t("waitingForData")
                    : controlState.systemEnabled
                    ? t("enabled")
                    : t("disabled")
                }
                highlight
              />
            </dl>
          </article>

          {/* Safety interlocks, each with a real pass/fail/unknown state rather
              than a static list of rules. */}
          <article className="rounded-3xl border border-amber-200/80 bg-gradient-to-br from-amber-50/80 to-orange-50/50 p-6 shadow-sm dark:border-amber-900/60 dark:from-amber-950/40 dark:to-orange-950/30">
            <div className="flex items-center gap-2 text-sm font-extrabold text-amber-900 dark:text-amber-200">
              <ShieldCheck
                size={18}
                className="shrink-0 text-amber-700 dark:text-amber-400"
                aria-hidden="true"
              />
              {t("safetyInterlocks")}
            </div>

            <ul className="mt-4 space-y-3">
              {safetyChecks.map((check) => {
                const { icon: Icon, className } =
                  CHECK_ICONS[check.state] ?? CHECK_ICONS.unknown;
                return (
                  <li key={check.id} className="flex items-start gap-2.5">
                    <Icon size={15} className={`mt-0.5 shrink-0 ${className}`} aria-hidden="true" />
                    <div className="min-w-0">
                      <p className="text-xs font-extrabold text-amber-900 dark:text-amber-200">
                        {t(check.labelKey)}
                      </p>
                      <p className="text-[11px] font-semibold leading-relaxed text-amber-900/70 dark:text-amber-300/70">
                        {t(check.descriptionKey, check.params ?? {})}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </article>

          {/* The operative reason, restated here so the control page never
              requires a trip to the dashboard to understand a blocked pump. */}
          <article
            className={`rounded-3xl border p-5 shadow-sm ${
              reasoning.blocked
                ? "border-rose-200 bg-rose-50/70 dark:border-rose-900/60 dark:bg-rose-950/30"
                : "border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90"
            }`}
            role="status"
            aria-live="polite"
          >
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-slate-500 dark:text-slate-400">
              {t("currentReason")}
            </p>
            <p className="mt-2 text-xs font-bold leading-relaxed text-slate-800 dark:text-slate-200">
              {t(reasoning.key, reasoning.params)}
            </p>
          </article>
        </div>
      </div>
      )}
    </div>
  );
}

function TelemetryRow({ label, formatted }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="min-w-0 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd className="shrink-0">
        <Readout formatted={formatted} size="sm" />
      </dd>
    </div>
  );
}

function HardwareRow({ label, value, mono = false, highlight = false }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="min-w-0 truncate">{label}</dt>
      <dd
        className={`shrink-0 font-bold ${mono ? "font-mono" : ""} ${
          highlight
            ? "text-blue-700 dark:text-cyan-400"
            : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
