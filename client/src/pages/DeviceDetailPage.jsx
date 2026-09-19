import { useCallback, useContext, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import useAsyncData from "../hooks/useAsyncData";
import { ArrowLeft, Check, Eye, LoaderCircle, Pencil, Shield, Sliders, X } from "lucide-react";
import {
  CardSkeleton,
  ErrorState,
} from "../components/ui/StateViews";
import { fetchDevice, fetchTelemetryHistory, renameDevice } from "../services/deviceApi";
import TankConfigForm from "../components/devices/TankConfigForm";
import HouseholdMembersCard from "../components/devices/HouseholdMembersCard";
import { useLanguage } from "../context/LanguageContext";
import { useToast } from "../context/ToastContext";
import { TelemetryContext } from "../context/TelemetryContext";
import { getApiErrorMessage } from "../utils/apiError";
import {
  formatPercentage,
  formatTimestamp,
} from "../utils/telemetryFormat";

export default function DeviceDetailPage() {
  const { deviceId } = useParams();
  const { t, language } = useLanguage();
  const toast = useToast();

  const [isEditingName, setIsEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  // Holds the result of a rename so the header updates immediately without
  // refetching the whole page.
  const [renamedDevice, setRenamedDevice] = useState(null);

  const loadDevice = useCallback(async () => {
    const data = await fetchDevice(deviceId);
    // The last few stored readings for this device, so the detail page shows
    // real history rather than only the current snapshot.
    const history = await fetchTelemetryHistory({ deviceId, page: 1, limit: 10 });
    return { ...data, recent: history.readings ?? [] };
  }, [deviceId]);

  const { data, isLoading, error, retry } = useAsyncData(loadDevice, [deviceId], {
    fallbackMessage: "Unable to load this device.",
  });

  const device = renamedDevice ?? data?.device ?? null;
  const recent = data?.recent ?? [];

  const telemetry = useContext(TelemetryContext);

  useEffect(() => {
    if (device && telemetry?.setDevice && telemetry.device?.deviceId !== device.deviceId) {
      telemetry.setDevice(device);
    }
  }, [device, telemetry]);

  const handleSaveName = async () => {
    setIsSavingName(true);
    try {
      const result = await renameDevice(deviceId, nameDraft.trim());
      setRenamedDevice(result.device);
      setIsEditingName(false);
      toast.success(result.message || t("deviceRenamed"));
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Unable to rename the device."));
    } finally {
      setIsSavingName(false);
    }
  };

  const startEditingName = () => {
    setNameDraft(device?.hasCustomName ? device.displayName : "");
    setIsEditingName(true);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <CardSkeleton rows={6} />
        <CardSkeleton rows={4} />
      </div>
    );
  }

  if (error || !device) {
    return (
      <div className="space-y-6">
        <BackLink t={t} />
        <ErrorState
          message={error || t("deviceNotFound")}
          onRetry={retry}
          retryLabel={t("retry")}
        />
      </div>
    );
  }

  const lastSeen = formatTimestamp(device.lastSeenAt, { locale: language });
  const firstSeen = formatTimestamp(device.firstSeenAt, { locale: language });

  return (
    <div className="space-y-6">
      <BackLink t={t} />

      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          {isEditingName ? (
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="text"
                value={nameDraft}
                onChange={(event) => setNameDraft(event.target.value)}
                maxLength={60}
                placeholder={device.deviceId}
                aria-label={t("friendlyName")}
                className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-900 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-blue-900/30"
              />
              <button
                type="button"
                onClick={handleSaveName}
                disabled={isSavingName}
                aria-label={t("save")}
                className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50"
              >
                {isSavingName ? (
                  <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                ) : (
                  <Check size={16} aria-hidden="true" />
                )}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsEditingName(false);
                  setNameDraft(device.hasCustomName ? device.displayName : "");
                }}
                disabled={isSavingName}
                aria-label={t("cancel")}
                className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="min-w-0 truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl lg:text-3xl dark:text-slate-100">
                {device.displayName}
              </h2>
              {/* Renaming is available to the device admin. */}
              {(device.userRole === "admin" || device.userRole === "owner") && (
                <button
                  type="button"
                  onClick={startEditingName}
                  aria-label={t("renameDevice")}
                  className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
                >
                  <Pencil size={15} aria-hidden="true" />
                </button>
              )}
            </div>
          )}
          <p className="mt-1 font-mono text-xs font-bold text-slate-400 dark:text-slate-500">
            {device.deviceId}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {device.userRole && (
            <span
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold ${
                device.userRole === "admin" || device.userRole === "owner"
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/70 dark:text-amber-300"
                  : device.userRole === "controller"
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-950/70 dark:text-cyan-300"
                  : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
              }`}
            >
              {device.userRole === "admin" || device.userRole === "owner" ? (
                <Shield size={13} className="shrink-0" />
              ) : device.userRole === "controller" ? (
                <Sliders size={13} className="shrink-0" />
              ) : (
                <Eye size={13} className="shrink-0" />
              )}
              {device.userRole === "admin" || device.userRole === "owner"
                ? "Your Access: Admin"
                : device.userRole === "controller"
                ? "Your Access: Controller"
                : "Your Access: Viewer"}
            </span>
          )}

          <span
            className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[11px] font-extrabold ${
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
      </div>

      {/* Household & Access Members Card */}
      <HouseholdMembersCard
        deviceId={device.deviceId}
        userRole={device.userRole || "viewer"}
      />

      {/* Identity and registry facts */}
      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90">
        <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
          {t("deviceDetails")}
        </h3>
        <dl className="mt-4 grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
          <DetailRow label={t("firmwareVersion")} value={device.firmwareVersion} t={t} />
          <DetailRow
            label={t("lastSeen")}
            value={lastSeen.hasValue ? lastSeen.text : null}
            t={t}
          />
          <DetailRow
            label={t("firstSeen")}
            value={firstSeen.hasValue ? firstSeen.text : null}
            t={t}
          />
          <DetailRow label={t("storedReadings")} value={String(device.totalReadings ?? 0)} t={t} />
          <DetailRow
            label={t("controlMode")}
            value={
              device.pumpMode
                ? t(device.pumpMode === "MANUAL" ? "manual" : "auto")
                : null
            }
            t={t}
          />
          <DetailRow
            label={t("systemState")}
            value={
              device.systemEnabled === null || device.systemEnabled === undefined
                ? null
                : device.systemEnabled
                ? t("enabled")
                : t("disabled")
            }
            t={t}
          />
        </dl>

        {/* System enable/disable is deliberately not duplicated here: it goes
            through the single safe control endpoint on the Pump Control page,
            so there is only one path that can change the relay state. */}
        <Link
          to="/pump-control"
          className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
        >
          {t("openPumpControl")}
        </Link>
      </section>

      {/* Tank Parameters & Configuration */}
      <TankConfigForm
        key={`${device.deviceId}-${device.tanks?.configuredAt || "new"}`}
        device={device}
        onUpdated={setRenamedDevice}
      />

      {/* Recent history */}
      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
        <div className="flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {t("recentReadings")}
          </h3>
          <Link
            to={`/history?deviceId=${encodeURIComponent(device.deviceId)}`}
            className="shrink-0 rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-cyan-400 dark:hover:bg-blue-950/40"
          >
            {t("viewFullHistory")}
          </Link>
        </div>

        {recent.length === 0 ? (
          <p className="mt-4 text-xs font-bold text-slate-400 dark:text-slate-500">
            {t("noHistoryDesc")}
          </p>
        ) : (
          <div className="-mx-5 mt-4 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[36rem] border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th scope="col" className="px-3 py-2.5 text-start ps-5 sm:ps-6">{t("timestamp")}</th>
                  <th scope="col" className="px-3 py-2.5 text-start">{t("upperTankLevel")}</th>
                  <th scope="col" className="px-3 py-2.5 text-start">{t("lowerTankLevel")}</th>
                  <th scope="col" className="px-3 py-2.5 text-start">{t("pumpState")}</th>
                  <th scope="col" className="px-3 py-2.5 text-start pe-5 sm:pe-6">{t("waterFlowStatus")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 font-semibold text-slate-700 dark:divide-slate-800/60 dark:text-slate-300">
                {recent.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-3 py-2.5 ps-5 tabular-nums sm:ps-6">
                      {formatTimestamp(entry.receivedAt, { locale: language }).text}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatPercentage(entry.upperTank?.percentage).text}
                    </td>
                    <td className="px-3 py-2.5 tabular-nums">
                      {formatPercentage(entry.lowerTank?.percentage).text}
                    </td>
                    <td className="px-3 py-2.5">
                      {entry.pumpStatus === "ON" ? t("on") : entry.pumpStatus === "OFF" ? t("off") : "—"}
                    </td>
                    <td className="px-3 py-2.5 pe-5 sm:pe-6">
                      {entry.waterFlowDetected === true
                        ? t("waterFlowing")
                        : entry.waterFlowDetected === false
                        ? t("noWaterFlow")
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}

function BackLink({ t }) {
  return (
    <Link
      to="/devices"
      className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 transition hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-slate-400 dark:hover:text-slate-200"
    >
      <ArrowLeft size={14} className="rtl:rotate-180" aria-hidden="true" />
      {t("backToDevices")}
    </Link>
  );
}

function DetailRow({ label, value, t, missing = false }) {
  const isMissing = missing || value === null || value === undefined;

  return (
    <div className="min-w-0 border-b border-slate-50 pb-2 dark:border-slate-800/60">
      <dt className="truncate text-[10px] font-extrabold uppercase tracking-wide text-slate-400 dark:text-slate-500">
        {label}
      </dt>
      <dd
        className={`mt-0.5 truncate text-xs font-extrabold ${
          isMissing
            ? "text-slate-400 dark:text-slate-500"
            : "text-slate-800 dark:text-slate-200"
        }`}
      >
        {isMissing ? t("notReported") : value}
      </dd>
    </div>
  );
}
