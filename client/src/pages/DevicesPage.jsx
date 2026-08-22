import { Link } from "react-router-dom";
import { ArrowRight, Cpu, Crown, Eye, Sliders } from "lucide-react";
import { CardSkeleton, EmptyState, ErrorState } from "../components/ui/StateViews";
import { fetchDevices } from "../services/deviceApi";
import useAsyncData from "../hooks/useAsyncData";
import { useLanguage } from "../context/LanguageContext";
import {
  formatPercentage,
  formatRelativeAge,
  formatTimestamp,
  tankStatusKey,
} from "../utils/telemetryFormat";

export default function DevicesPage() {
  const { t, language } = useLanguage();
  const { data, isLoading, error, retry } = useAsyncData(fetchDevices, [], {
    fallbackMessage: "Unable to load devices.",
  });

  const devices = data?.devices ?? [];

  return (
    <div className="space-y-6">
      <div className="min-w-0">
        <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
          {t("hardwareRegistry")}
        </p>
        <h2 className="mt-0.5 text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl dark:text-slate-100">
          {t("devices")}
        </h2>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          {t("devicesDesc")}
        </p>
      </div>

      {isLoading && (
        <div className="grid gap-5 lg:grid-cols-2">
          <CardSkeleton rows={5} />
          <CardSkeleton rows={5} />
        </div>
      )}

      {!isLoading && error && (
        <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />
      )}

      {!isLoading && !error && devices.length === 0 && (
        <EmptyState
          icon={Cpu}
          title={t("noDevicesTitle")}
          description={t("noDevicesDesc")}
        />
      )}

      {!isLoading && !error && devices.length > 0 && (
        <div className="grid gap-5 lg:grid-cols-2">
          {devices.map((device) => (
            <DeviceCard key={device.deviceId} device={device} t={t} language={language} />
          ))}
        </div>
      )}
    </div>
  );
}

function DeviceCard({ device, t, language }) {
  const lastSeen = formatTimestamp(device.lastSeenAt, { locale: language });
  const age = formatRelativeAge(device.lastSeenAt, t);
  const upperStatusKey = tankStatusKey(device.upperSensorStatus);
  const lowerStatusKey = tankStatusKey(device.lowerSensorStatus);

  return (
    <article className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm shadow-slate-900/5 transition hover:-translate-y-0.5 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-lg font-extrabold text-slate-900 dark:text-slate-100">
              {device.displayName}
            </h3>
            {device.userRole && (
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold ${
                  device.userRole === "owner"
                    ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                    : device.userRole === "controller"
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-cyan-300"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                }`}
              >
                {device.userRole === "owner" ? (
                  <Crown size={10} className="shrink-0" />
                ) : device.userRole === "controller" ? (
                  <Sliders size={10} className="shrink-0" />
                ) : (
                  <Eye size={10} className="shrink-0" />
                )}
                {device.userRole === "owner"
                  ? "Owner"
                  : device.userRole === "controller"
                  ? "Controller"
                  : device.userRole === "admin"
                  ? "Admin"
                  : "Viewer"}
              </span>
            )}
          </div>
          <p className="mt-0.5 truncate font-mono text-[11px] font-bold text-slate-400 dark:text-slate-500">
            {device.deviceId}
          </p>
        </div>

        <span
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ${
            device.isOnline
              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
              : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`}
        >
          <span
            className={`size-1.5 rounded-full ${
              device.isOnline ? "animate-pulse bg-emerald-500" : "bg-slate-400"
            }`}
            aria-hidden="true"
          />
          {device.isOnline ? t("deviceOnline") : t("deviceOffline")}
        </span>
      </div>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
        <Row
          label={t("lastSeen")}
          value={lastSeen.hasValue ? (age ?? lastSeen.text) : t("never")}
          muted={!lastSeen.hasValue}
        />
        <Row
          label={t("firmwareVersion")}
          // The ultrasonic firmware does not report a version, so this is
          // genuinely unknown rather than blank or invented.
          value={device.firmwareVersion ?? t("notReported")}
          muted={!device.firmwareVersion}
        />
        <Row
          label={t("upperSensor")}
          value={upperStatusKey ? t(upperStatusKey) : t("waitingForData")}
          muted={!upperStatusKey}
          tone={device.upperSensorStatus === "Sensor Error" ? "bad" : "neutral"}
        />
        <Row
          label={t("lowerSensor")}
          value={lowerStatusKey ? t(lowerStatusKey) : t("waitingForData")}
          muted={!lowerStatusKey}
          tone={device.lowerSensorStatus === "Sensor Error" ? "bad" : "neutral"}
        />
        <Row
          label={t("upperTankLevel")}
          value={formatPercentage(device.upperTank?.percentage).text}
          muted={!formatPercentage(device.upperTank?.percentage).hasValue}
        />
        <Row
          label={t("lowerTankLevel")}
          value={formatPercentage(device.lowerTank?.percentage).text}
          muted={!formatPercentage(device.lowerTank?.percentage).hasValue}
        />
        <Row
          label={t("pumpState")}
          value={
            device.pumpStatus
              ? device.pumpStatus === "ON"
                ? t("on")
                : t("off")
              : t("waitingForData")
          }
          muted={!device.pumpStatus}
          tone={device.pumpStatus === "ON" ? "good" : "neutral"}
        />
        <Row
          label={t("controlMode")}
          value={
            device.pumpMode
              ? t(device.pumpMode === "MANUAL" ? "manual" : "auto")
              : t("notAvailable")
          }
          muted={!device.pumpMode}
        />
        <Row
          label={t("systemState")}
          value={
            device.systemEnabled === null || device.systemEnabled === undefined
              ? t("notAvailable")
              : device.systemEnabled
              ? t("enabled")
              : t("disabled")
          }
          muted={device.systemEnabled === null || device.systemEnabled === undefined}
        />
        <Row
          label={t("storedReadings")}
          value={String(device.totalReadings ?? 0)}
          mono
        />
      </dl>

      <Link
        to={`/devices/${device.deviceId}`}
        className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:w-auto dark:focus-visible:ring-blue-900/40"
      >
        {t("viewDetails")}
        <ArrowRight size={14} className="rtl:rotate-180" aria-hidden="true" />
      </Link>
    </article>
  );
}

const TONE_CLASSES = {
  good: "text-emerald-600 dark:text-emerald-400",
  bad: "text-rose-600 dark:text-rose-400",
  neutral: "text-slate-800 dark:text-slate-200",
};

function Row({ label, value, muted = false, tone = "neutral", mono = false }) {
  return (
    <div className="min-w-0">
      <dt className="truncate text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 truncate text-xs font-extrabold ${mono ? "font-mono" : ""} ${
          muted ? "text-slate-400 dark:text-slate-500" : TONE_CLASSES[tone]
        }`}
      >
        {value}
      </dd>
    </div>
  );
}
