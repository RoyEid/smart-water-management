import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Cpu, LoaderCircle, Pencil, X } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../../components/ui/StateViews";
import { fetchDevices, renameDevice } from "../../services/deviceApi";
import useAsyncData from "../../hooks/useAsyncData";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatPercentage, formatRelativeAge } from "../../utils/telemetryFormat";

/**
 * Administrative view of the device registry.
 *
 * The one thing an admin can change here is the friendly name. Enabling or
 * disabling the system stays on the Pump Control page so every relay command
 * goes through the single safe control endpoint.
 */
export default function AdminDevicesPage() {
  const { t } = useLanguage();
  const toast = useToast();

  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading, error, retry, refresh } = useAsyncData(fetchDevices, [], {
    fallbackMessage: "Unable to load devices.",
  });

  const devices = data?.devices ?? [];

  const startEditing = (device) => {
    setEditingId(device.deviceId);
    setNameDraft(device.hasCustomName ? device.displayName : "");
  };

  const saveName = async (deviceId) => {
    setIsSaving(true);
    try {
      const result = await renameDevice(deviceId, nameDraft.trim());
      toast.success(result.message || t("deviceRenamed"));
      setEditingId(null);
      refresh();
    } catch (requestError) {
      toast.error(getApiErrorMessage(requestError, "Unable to rename the device."));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
        {t("deviceRegistry")}
      </h3>
      <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
        {t("deviceRegistryDesc")}
      </p>

      <div className="mt-5">
        {isLoading && <TableSkeleton rows={3} columns={5} />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />
        )}

        {!isLoading && !error && devices.length === 0 && (
          <EmptyState icon={Cpu} title={t("noDevicesTitle")} description={t("noDevicesDesc")} />
        )}

        {!isLoading && !error && devices.length > 0 && (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[46rem] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th scope="col" className="px-3 py-3 text-start ps-5 sm:ps-6">{t("deviceId")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("friendlyName")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("state")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("lastSeen")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("levels")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("storedReadings")}</th>
                  <th scope="col" className="px-3 py-3 text-end pe-5 sm:pe-6">
                    <span className="sr-only">{t("actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700 dark:divide-slate-800/60 dark:text-slate-300">
                {devices.map((device) => (
                  <tr key={device.deviceId}>
                    <td className="px-3 py-3 ps-5 font-mono text-[11px] font-bold sm:ps-6">
                      {device.deviceId}
                    </td>

                    <td className="px-3 py-3">
                      {editingId === device.deviceId ? (
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={nameDraft}
                            onChange={(event) => setNameDraft(event.target.value)}
                            maxLength={60}
                            placeholder={device.deviceId}
                            aria-label={t("friendlyName")}
                            className="h-9 w-40 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-bold outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                          />
                          <button
                            type="button"
                            onClick={() => saveName(device.deviceId)}
                            disabled={isSaving}
                            aria-label={t("save")}
                            className="grid size-8 shrink-0 place-items-center rounded-lg bg-blue-600 text-white transition hover:bg-blue-700 disabled:opacity-50"
                          >
                            {isSaving ? (
                              <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
                            ) : (
                              <Check size={13} aria-hidden="true" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            disabled={isSaving}
                            aria-label={t("cancel")}
                            className="grid size-8 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:hover:bg-slate-800"
                          >
                            <X size={13} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="truncate font-extrabold text-slate-900 dark:text-slate-100">
                            {device.displayName}
                          </span>
                          <button
                            type="button"
                            onClick={() => startEditing(device)}
                            aria-label={t("renameDevice")}
                            className="shrink-0 rounded-md p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800"
                          >
                            <Pencil size={13} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                          device.isOnline
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                            : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                        }`}
                      >
                        {device.isOnline ? t("deviceOnline") : t("deviceOffline")}
                      </span>
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-[11px]">
                      {formatRelativeAge(device.lastSeenAt, t) ?? (
                        <span className="text-slate-400">{t("never")}</span>
                      )}
                    </td>

                    <td className="whitespace-nowrap px-3 py-3 text-[11px] tabular-nums">
                      {formatPercentage(device.upperTank?.percentage).text} /{" "}
                      {formatPercentage(device.lowerTank?.percentage).text}
                    </td>

                    <td className="px-3 py-3 font-mono text-[11px] tabular-nums">
                      {(device.totalReadings ?? 0).toLocaleString()}
                    </td>

                    <td className="px-3 py-3 pe-5 text-end sm:pe-6">
                      <Link
                        to={`/devices/${device.deviceId}`}
                        className="rounded-lg px-2 py-1 text-[11px] font-bold text-blue-600 transition hover:bg-blue-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:text-cyan-400 dark:hover:bg-blue-950/40"
                      >
                        {t("viewDetails")}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
