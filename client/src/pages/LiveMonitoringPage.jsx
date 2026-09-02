import { Cpu, Droplets, Radio, Waves, Zap, ZapOff } from "lucide-react";
import MetricCard from "../components/dashboard/MetricCard";
import PageHeader from "../components/dashboard/PageHeader";
import WaterLevelChart from "../components/dashboard/WaterLevelChart";
import { CardSkeleton, EmptyState, ErrorState, OfflineState } from "../components/ui/StateViews";
import useDeviceControl from "../hooks/useDeviceControl";
import { useTelemetry } from "../context/TelemetryContext";
import { useLanguage } from "../context/LanguageContext";
import {
  formatNumber,
  formatPercentage,
  formatTimestamp,
} from "../utils/telemetryFormat";

export default function LiveMonitoringPage() {
  const {
    reading,
    readings,
    device,
    isOnline,
    isStale,
    isLoading,
    error,
    socketConnected,
    lastUpdatedAt,
    retry,
  } = useTelemetry();
  const { controlState } = useDeviceControl();
  const { t, language } = useLanguage();

  const upper = reading?.upperTank ?? null;
  const lower = reading?.lowerTank ?? null;
  const lastUpdated = formatTimestamp(lastUpdatedAt, { locale: language });

  const isDawle = isOnline && reading?.powerSource === "DAWLE";
  const isMoteur = isOnline && reading?.powerSource === "MOTEUR";

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("telemetryStream")}
        title={t("liveHardwareDiagnostics")}
        isOnline={isOnline}
        isStale={isStale}
        socketConnected={socketConnected}
        lastUpdatedAt={lastUpdatedAt}
      />

      {error && <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />}

      {isStale && !error && (
        <OfflineState message={t("staleDataNotice")} onRetry={retry} retryLabel={t("retry")} />
      )}

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
          <CardSkeleton rows={1} />
        </div>
      ) : !device ? (
        <EmptyState
          icon={Cpu}
          title={t("noDeviceAssignedTitle")}
          description={t("noDeviceAssignedDesc")}
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Radio}
              label={t("upperDistance")}
              formatted={formatNumber(upper?.distanceCm, { decimals: 1, unit: "cm" })}
              detail="TRIG 7 / ECHO 15"
              accent="cyan"
            />
            <MetricCard
              icon={Radio}
              label={t("lowerDistance")}
              formatted={formatNumber(lower?.distanceCm, { decimals: 1, unit: "cm" })}
              detail="TRIG 12 / ECHO 13"
              accent="indigo"
            />
            <MetricCard
              icon={Droplets}
              label={t("upperTankLevel")}
              formatted={formatPercentage(upper?.percentage)}
              detail={t("capacityPercentage")}
              accent="cyan"
            />
            <MetricCard
              icon={Waves}
              label={t("lowerTankLevel")}
              formatted={formatPercentage(lower?.percentage)}
              detail={t("capacityPercentage")}
              accent="indigo"
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Waves}
              label={t("upperWaterHeight")}
              formatted={formatNumber(upper?.waterHeightCm, { decimals: 1, unit: "cm" })}
              detail={t("measuredColumn")}
              accent="blue"
            />
            <MetricCard
              icon={Waves}
              label={t("lowerWaterHeight")}
              formatted={formatNumber(lower?.waterHeightCm, { decimals: 1, unit: "cm" })}
              detail={t("measuredColumn")}
              accent="blue"
            />
            <MetricCard
              icon={Waves}
              label={t("waterFlowStatus")}
              formatted={{
                hasValue: true,
                text: !isOnline
                  ? t("sensorOffline")
                  : reading?.waterFlowDetected === true
                  ? t("waterFlowing")
                  : reading?.waterFlowDetected === false
                  ? t("noWaterFlow")
                  : t("waitingForData"),
              }}
              detail="YF-S201 (GPIO 18)"
              accent={reading?.waterFlowDetected === true ? "cyan" : "slate"}
            />
            <MetricCard
              icon={isDawle ? Zap : ZapOff}
              label={t("powerSource")}
              formatted={{
                hasValue: true,
                text: !isOnline
                  ? t("sensorOffline")
                  : reading?.powerSource === "DAWLE"
                  ? t("dawle")
                  : reading?.powerSource === "MOTEUR"
                  ? t("moteur")
                  : t("waitingForData"),
              }}
              detail="ZMPT101B (GPIO 3)"
              accent={isDawle ? "emerald" : "amber"}
            />
          </section>

          {/* Raw stream state — the values a diagnosing engineer needs, kept
              separate from the presentation-oriented cards above. */}
          <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              {t("streamState")}
            </h3>
            <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2">
              <StreamRow
                label={t("liveConnection")}
                value={socketConnected ? t("connected") : t("disconnected")}
                tone={socketConnected ? "good" : "bad"}
              />
              <StreamRow
                label={t("deviceState")}
                value={isOnline ? t("deviceOnline") : t("deviceOffline")}
                tone={isOnline ? "good" : "bad"}
              />
              <StreamRow
                label={t("powerSource")}
                value={
                  !isOnline
                    ? t("deviceOffline")
                    : reading?.powerSource === "DAWLE"
                    ? t("dawle")
                    : reading?.powerSource === "MOTEUR"
                    ? t("moteur")
                    : t("waitingForData")
                }
                tone={isDawle ? "good" : isMoteur ? "warning" : "muted"}
              />
              <StreamRow
                label={t("lastUpdated")}
                value={lastUpdated.hasValue ? lastUpdated.text : t("waitingForData")}
                tone={lastUpdated.hasValue ? "neutral" : "muted"}
              />
              <StreamRow
                label={t("deviceId")}
                value={reading?.deviceId ?? t("waitingForData")}
                tone={reading?.deviceId ? "neutral" : "muted"}
                mono
              />
              <StreamRow
                label={t("pumpState")}
                value={
                  reading?.pumpStatus
                    ? reading.pumpStatus === "ON"
                      ? t("on")
                      : t("off")
                    : t("waitingForData")
                }
                tone={reading?.pumpStatus ? "neutral" : "muted"}
              />
              <StreamRow
                label={t("controlMode")}
                value={
                  controlState.pumpMode
                    ? t(controlState.pumpMode === "MANUAL" ? "manual" : "auto")
                    : t("waitingForData")
                }
                tone={controlState.pumpMode ? "neutral" : "muted"}
              />
              <StreamRow
                label={t("sensorStatus")}
                value={reading?.sensorStatus ?? t("nominal")}
                tone={reading?.sensorStatus ? "bad" : "good"}
              />
              <StreamRow
                label={t("bufferedPoints")}
                value={String(readings.length)}
                tone="neutral"
                mono
              />
            </dl>
          </section>

          <WaterLevelChart readings={readings} />
        </>
      )}
    </div>
  );
}

const TONE_CLASSES = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-800 dark:text-slate-200",
  muted: "text-slate-400 dark:text-slate-500",
};

function StreamRow({ label, value, tone = "neutral", mono = false }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-50 pb-2 last:border-b-0 dark:border-slate-800/60">
      <dt className="min-w-0 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
        {label}
      </dt>
      <dd
        className={`shrink-0 text-xs font-extrabold ${mono ? "font-mono" : ""} ${
          TONE_CLASSES[tone]
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
