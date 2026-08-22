import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, Cpu, Crown, Eye, LoaderCircle, Pencil, Sliders, Users, X } from "lucide-react";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../../components/ui/StateViews";
import { renameDevice } from "../../services/deviceApi";
import { fetchTelemetryStats } from "../../services/adminApi";
import useAsyncData from "../../hooks/useAsyncData";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatRelativeAge } from "../../utils/telemetryFormat";

/**
 * Platform Administrator Device Registry View.
 *
 * Admins monitor hardware identity, platform health, owner association, and member metrics.
 * Physical actuation and member management are strictly managed at household owner level.
 */
export default function AdminDevicesPage() {
  const { t } = useLanguage();
  const toast = useToast();

  const [editingId, setEditingId] = useState(null);
  const [nameDraft, setNameDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data, isLoading, error, retry, refresh } = useAsyncData(fetchTelemetryStats, [], {
    fallbackMessage: "Unable to load device registry.",
  });

  const devices = data?.devices ?? [];

  const startEditing = (device) => {
    setEditingId(device.deviceId);
    setNameDraft(device.displayName || "");
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
      <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
            {t("deviceRegistry")}
          </h3>
          <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
            Platform-wide registry of physical ESP32 tanks, assigned owners, and household members.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            Total Devices: {devices.length}
          </span>
        </div>
      </div>

      <div className="mt-5">
        {isLoading && <TableSkeleton rows={3} columns={7} />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />
        )}

        {!isLoading && !error && devices.length === 0 && (
          <EmptyState icon={Cpu} title={t("noDevicesTitle")} description={t("noDevicesDesc")} />
        )}

        {!isLoading && !error && devices.length > 0 && (
          <div className="-mx-5 overflow-x-auto sm:-mx-6">
            <table className="w-full min-w-[56rem] border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                  <th scope="col" className="px-3 py-3 text-start ps-5 sm:ps-6">{t("deviceId")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("friendlyName")}</th>
                  <th scope="col" className="px-3 py-3 text-start">Owner</th>
                  <th scope="col" className="px-3 py-3 text-start">Members</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("state")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("lastSeen")}</th>
                  <th scope="col" className="px-3 py-3 text-start">{t("storedReadings")}</th>
                  <th scope="col" className="px-3 py-3 text-end pe-5 sm:pe-6">
                    <span className="sr-only">{t("actions")}</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs font-semibold text-slate-700 dark:divide-slate-800/60 dark:text-slate-300">
                {devices.map((device) => {
                  return (
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
                        {device.owner ? (
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 font-bold text-slate-900 dark:text-slate-100">
                              <Crown size={12} className="text-amber-500 shrink-0" />
                              <span className="truncate">{device.owner.name}</span>
                            </div>
                            <p className="truncate text-[10px] text-slate-400 dark:text-slate-500 font-normal">
                              {device.owner.email}
                            </p>
                          </div>
                        ) : (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                            Unassigned
                          </span>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                            <Users size={11} />
                            {device.membersCount || 0}
                          </span>
                          {device.controllersCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold text-blue-700 dark:bg-blue-950/60 dark:text-cyan-300" title="Controllers">
                              <Sliders size={9} />
                              {device.controllersCount}
                            </span>
                          )}
                          {device.viewersCount > 0 && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-50 px-1.5 py-0.5 text-[9px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400" title="Viewers">
                              <Eye size={9} />
                              {device.viewersCount}
                            </span>
                          )}
                        </div>
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

                      <td className="px-3 py-3 font-mono text-[11px] tabular-nums">
                        {(device.records ?? 0).toLocaleString()}
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
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
