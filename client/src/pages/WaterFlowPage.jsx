import { Info } from "lucide-react";
import PageHeader from "../components/dashboard/PageHeader";
import WaterFlowCard from "../components/dashboard/WaterFlowCard";
import WaterTransferVisual from "../components/dashboard/WaterTransferVisual";
import { ErrorState } from "../components/ui/StateViews";
import useDeviceControl from "../hooks/useDeviceControl";
import { useTelemetry } from "../context/TelemetryContext";
import { useLanguage } from "../context/LanguageContext";

export default function WaterFlowPage() {
  const { reading, isOnline, isStale, error, socketConnected, lastUpdatedAt, retry } =
    useTelemetry();
  const { controlState } = useDeviceControl();
  const { t } = useLanguage();

  const waterFlowDetected = reading?.waterFlowDetected;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow={t("realtimeOverview")}
        title={t("waterFlow")}
        isOnline={isOnline}
        isStale={isStale}
        socketConnected={socketConnected}
        lastUpdatedAt={lastUpdatedAt}
      />

      {error && <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />}

      <WaterFlowCard
        waterFlowDetected={waterFlowDetected}
        isOnline={isOnline}
      />

      <WaterTransferVisual
        pumpStatus={reading?.pumpStatus}
        pumpMode={controlState.pumpMode ?? reading?.pumpMode}
        isOnline={isOnline}
      />

      <div className="flex items-start gap-2.5 rounded-2xl bg-slate-50 p-4 text-[11px] font-medium leading-relaxed text-slate-500 ring-1 ring-slate-200/80 dark:bg-slate-800/60 dark:text-slate-400 dark:ring-slate-700/80">
        <Info size={14} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" />
        <span>{t("flowSensorNotice")}</span>
      </div>
    </div>
  );
}
