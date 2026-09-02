import { Cpu, Droplets, FlaskConical, Ruler, Waves } from "lucide-react";
import AlertsPanel from "../components/dashboard/AlertsPanel";
import AutoControlReasonCard from "../components/dashboard/AutoControlReasonCard";
import MetricCard from "../components/dashboard/MetricCard";
import PageHeader from "../components/dashboard/PageHeader";
import PowerSourceCard from "../components/dashboard/PowerSourceCard";
import TankVisual from "../components/dashboard/TankVisual";
import WaterFlowCard from "../components/dashboard/WaterFlowCard";
import WaterLevelChart from "../components/dashboard/WaterLevelChart";
import WaterTransferVisual from "../components/dashboard/WaterTransferVisual";
import { CardSkeleton, EmptyState, ErrorState, OfflineState } from "../components/ui/StateViews";
import useDeviceControl from "../hooks/useDeviceControl";
import useAlerts from "../hooks/useAlerts";
import { useTelemetry } from "../context/TelemetryContext";
import { useLanguage } from "../context/LanguageContext";
import {
  formatNumber,
  formatPercentage,
  formatTime,
  formatVolume,
} from "../utils/telemetryFormat";

export default function DashboardPage() {
  const {
    reading,
    readings,
    device,
    tanks,
    isOnline,
    isStale,
    isLoading,
    error,
    socketConnected,
    lastUpdatedAt,
    retry,
  } = useTelemetry();
  const { controlState, updating, setAllowPumpOnMoteur } = useDeviceControl();
  const { alerts, isLoading: alertsLoading } = useAlerts();
  const { t, language } = useLanguage();

  const upperTank = reading?.upperTank ?? null;
  const lowerTank = reading?.lowerTank ?? null;
  const upperCapacity = tanks?.upper?.capacityLiters ?? null;
  const lowerCapacity = tanks?.lower?.capacityLiters ?? null;

  const lastUpdatedText = formatTime(lastUpdatedAt, { locale: language }).hasValue
    ? formatTime(lastUpdatedAt, { locale: language }).text
    : t("waitingForData");

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("realtimeOverview")}
        title={t("dualTankTelemetry")}
        isOnline={isOnline}
        isStale={isStale}
        socketConnected={socketConnected}
        lastUpdatedAt={lastUpdatedAt}
      />

      {/* A backend error is shown once at the top rather than repeated inside
          every card, and it does not hide the last good reading below it. */}
      {error && <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />}

      {isStale && !error && (
        <OfflineState message={t("staleDataNotice")} onRetry={retry} retryLabel={t("retry")} />
      )}

      {isLoading ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <CardSkeleton rows={4} />
          <CardSkeleton rows={4} />
        </div>
      ) : !device ? (
        <EmptyState
          icon={Cpu}
          title={t("noDeviceAssignedTitle")}
          description={t("noDeviceAssignedDesc")}
        />
      ) : (
        <>
          <section className="space-y-4">
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TankVisual
                title={t("upperTank")}
                subtitle={t("destinationReservoir")}
                tank={upperTank}
                tankCapacity={upperCapacity}
                pumpStatus={reading?.pumpStatus}
                isOnline={isOnline}
                isStale={isStale}
                lastUpdatedText={lastUpdatedText}
                accent="cyan"
              />

              <TankVisual
                title={t("lowerTank")}
                subtitle={t("sourceReservoir")}
                tank={lowerTank}
                tankCapacity={lowerCapacity}
                pumpStatus={reading?.pumpStatus}
                isOnline={isOnline}
                isStale={isStale}
                lastUpdatedText={lastUpdatedText}
                accent="indigo"
              />
            </div>

            <WaterTransferVisual
              pumpStatus={reading?.pumpStatus}
              pumpMode={controlState.pumpMode ?? reading?.pumpMode}
              isOnline={isOnline}
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <AutoControlReasonCard
              reading={reading}
              controlState={controlState}
              isOnline={isOnline}
            />
            <AlertsPanel alerts={alerts} isLoading={alertsLoading} />
          </section>

          {/* Levels, distances and derived volumes. Every one of these renders an
              explicit placeholder when the device has not reported it. */}
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              icon={Droplets}
              label={t("upperTankLevel")}
              formatted={formatPercentage(upperTank?.percentage)}
              detail={t("destinationReservoir")}
              accent="cyan"
            />
            <MetricCard
              icon={Waves}
              label={t("lowerTankLevel")}
              formatted={formatPercentage(lowerTank?.percentage)}
              detail={t("sourceReservoir")}
              accent="indigo"
            />
            <MetricCard
              icon={Ruler}
              label={t("upperDistance")}
              formatted={formatNumber(upperTank?.distanceCm, { decimals: 1, unit: "cm" })}
              detail={t("sensorToSurface")}
              accent="blue"
            />
            <MetricCard
              icon={Ruler}
              label={t("lowerDistance")}
              formatted={formatNumber(lowerTank?.distanceCm, { decimals: 1, unit: "cm" })}
              detail={t("sensorToSurface")}
              accent="blue"
            />
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <MetricCard
              icon={FlaskConical}
              label={t("upperTankVolume")}
              formatted={formatVolume(upperTank?.percentage, { capacityLiters: upperCapacity })}
              detail={
                upperCapacity
                  ? `${t("destinationReservoir")} (${Number(upperCapacity).toLocaleString()} L)`
                  : t("destinationReservoir")
              }
              accent="emerald"
            />
            <MetricCard
              icon={FlaskConical}
              label={t("lowerTankVolume")}
              formatted={formatVolume(lowerTank?.percentage, { capacityLiters: lowerCapacity })}
              detail={
                lowerCapacity
                  ? `${t("sourceReservoir")} (${Number(lowerCapacity).toLocaleString()} L)`
                  : t("sourceReservoir")
              }
              accent="violet"
            />
          </section>

          <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <PowerSourceCard
              powerSource={reading?.powerSource}
              allowPumpOnMoteur={controlState.allowPumpOnMoteur ?? reading?.allowPumpOnMoteur}
              isOnline={isOnline}
              updating={updating}
              setAllowPumpOnMoteur={setAllowPumpOnMoteur}
            />
            <WaterFlowCard
              waterFlowDetected={reading?.waterFlowDetected}
              isOnline={isOnline}
            />
          </section>

          <section>
            <WaterLevelChart readings={readings} />
          </section>
        </>
      )}
    </div>
  );
}
