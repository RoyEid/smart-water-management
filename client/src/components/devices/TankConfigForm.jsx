import { useState } from "react";
import { AlertTriangle, Check, Container, Info, LoaderCircle, Pencil, ShieldAlert, SlidersHorizontal, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { useTelemetry } from "../../context/TelemetryContext";
import { updateTankConfig } from "../../services/deviceApi";
import { getApiErrorMessage } from "../../utils/apiError";

export default function TankConfigForm({ device, onUpdated }) {
  const { isAdmin } = useAuth();
  const { t } = useLanguage();
  const toast = useToast();

  let setDeviceInContext = null;
  try {
    const telemetry = useTelemetry();
    setDeviceInContext = telemetry?.setDevice ?? null;
  } catch {
    // In case TankConfigForm is rendered outside TelemetryContext (e.g. standalone test)
  }

  const tanks = device?.tanks;
  const isConfigured = Boolean(tanks?.isConfigured);
  const canEdit = !isAdmin;

  const [isEditing, setIsEditing] = useState(() => !isConfigured);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);

  const [upperCap, setUpperCap] = useState(() =>
    tanks?.upper?.capacityLiters != null ? String(tanks.upper.capacityLiters) : ""
  );
  const [upperHeight, setUpperHeight] = useState(() =>
    tanks?.upper?.heightMeters != null ? String(tanks.upper.heightMeters) : ""
  );
  const [lowerCap, setLowerCap] = useState(() =>
    tanks?.lower?.capacityLiters != null ? String(tanks.lower.capacityLiters) : ""
  );
  const [lowerHeight, setLowerHeight] = useState(() =>
    tanks?.lower?.heightMeters != null ? String(tanks.lower.heightMeters) : ""
  );

  const [isSaving, setIsSaving] = useState(false);
  const [validationError, setValidationError] = useState("");

  const resetDrafts = () => {
    setUpperCap(tanks?.upper?.capacityLiters != null ? String(tanks.upper.capacityLiters) : "");
    setUpperHeight(tanks?.upper?.heightMeters != null ? String(tanks.upper.heightMeters) : "");
    setLowerCap(tanks?.lower?.capacityLiters != null ? String(tanks.lower.capacityLiters) : "");
    setLowerHeight(tanks?.lower?.heightMeters != null ? String(tanks.lower.heightMeters) : "");
    setValidationError("");
  };

  const handleStartEdit = () => {
    resetDrafts();
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    resetDrafts();
    if (isConfigured) {
      setIsEditing(false);
    }
  };

  const validateInputs = () => {
    setValidationError("");

    const upperCapacityNum = Number(upperCap);
    const upperHeightNum = Number(upperHeight);
    const lowerCapacityNum = Number(lowerCap);
    const lowerHeightNum = Number(lowerHeight);

    if (!Number.isFinite(upperCapacityNum) || upperCapacityNum <= 0) {
      setValidationError("Upper tank capacity must be a positive number in Liters.");
      return null;
    }
    if (!Number.isFinite(upperHeightNum) || upperHeightNum <= 0) {
      setValidationError("Upper tank usable height must be a positive number in Meters.");
      return null;
    }
    if (!Number.isFinite(lowerCapacityNum) || lowerCapacityNum <= 0) {
      setValidationError("Lower tank capacity must be a positive number in Liters.");
      return null;
    }
    if (!Number.isFinite(lowerHeightNum) || lowerHeightNum <= 0) {
      setValidationError("Lower tank usable height must be a positive number in Meters.");
      return null;
    }

    return {
      upper: { capacityLiters: upperCapacityNum, heightMeters: upperHeightNum },
      lower: { capacityLiters: lowerCapacityNum, heightMeters: lowerHeightNum },
    };
  };

  const handleFormSubmit = (event) => {
    event.preventDefault();
    if (!canEdit) return;

    const validPayload = validateInputs();
    if (!validPayload) return;

    setIsConfirmModalOpen(true);
  };

  const handleConfirmSave = async () => {
    const payload = validateInputs();
    if (!payload) {
      setIsConfirmModalOpen(false);
      return;
    }

    setIsSaving(true);

    try {
      const result = await updateTankConfig(device.deviceId, payload);
      toast.success(result.message || "Tank configuration saved.");
      setIsEditing(false);
      setIsConfirmModalOpen(false);
      if (setDeviceInContext && result?.device) {
        setDeviceInContext(result.device);
      }
      if (onUpdated && result?.device) {
        onUpdated(result.device);
      }
    } catch (requestError) {
      const msg = getApiErrorMessage(requestError, "Unable to save tank configuration.");
      setValidationError(msg);
      toast.error(msg);
      setIsConfirmModalOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/90 sm:p-7">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-blue-400">
              <Container size={18} aria-hidden="true" />
            </span>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                {t("tankConfiguration")}
              </h3>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
                {t("tankConfigDesc")}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {isConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 px-3 py-1 text-xs font-extrabold text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-800">
              <Check size={14} />
              {t("tankConfigured")}
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/60 px-3 py-1 text-xs font-extrabold text-amber-700 dark:text-amber-400 ring-1 ring-amber-200 dark:ring-amber-800">
              <SlidersHorizontal size={14} />
              {t("tankNotConfigured")}
            </span>
          )}

          {/* Edit Configuration Button (Shown only when configured & not editing & user can edit) */}
          {isConfigured && !isEditing && canEdit && (
            <button
              type="button"
              onClick={handleStartEdit}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800 px-3.5 py-1.5 text-xs font-extrabold text-slate-700 dark:text-slate-200 shadow-sm transition hover:bg-slate-50 dark:hover:bg-slate-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100"
            >
              <Pencil size={14} aria-hidden="true" />
              {t("editConfiguration")}
            </button>
          )}
        </div>
      </div>

      {/* Permission Notices */}
      {isAdmin && (
        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-amber-50/80 dark:bg-amber-950/40 p-4 text-xs font-semibold text-amber-800 dark:text-amber-300 ring-1 ring-amber-200 dark:ring-amber-800/60">
          <ShieldAlert size={18} className="mt-0.5 shrink-0 text-amber-600 dark:text-amber-400" />
          <div>
            <p className="font-extrabold">{t("adminReadOnlyTitle")}</p>
            <p className="mt-0.5 text-[11px] opacity-90">{t("adminReadOnlyNotice")}</p>
          </div>
        </div>
      )}

      {/* Validation Error Alert */}
      {validationError && (
        <div className="mt-5 flex items-start gap-2.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 p-4 text-xs font-bold text-rose-700 dark:text-rose-300 ring-1 ring-rose-200 dark:ring-rose-800">
          <Info size={16} className="mt-0.5 shrink-0 text-rose-500" />
          <span>{validationError}</span>
        </div>
      )}

      {/* READ-ONLY DISPLAY VIEW */}
      {isConfigured && !isEditing ? (
        <div className="mt-6 grid gap-6 md:grid-cols-2">
          {/* Upper Tank Read-Only Card */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-cyan-400">
                {t("upperTank")}
              </h4>
              <span className="text-[10px] font-bold text-slate-400">{t("destination")}</span>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="font-semibold text-slate-400 dark:text-slate-500">{t("tankCapacity")}</dt>
                <dd className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {tanks.upper?.capacityLiters ? `${Number(tanks.upper.capacityLiters).toLocaleString()} L` : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-400 dark:text-slate-500">{t("usableHeight")}</dt>
                <dd className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {tanks.upper?.heightMeters ? `${tanks.upper.heightMeters} m` : "—"}
                </dd>
              </div>
            </dl>
          </div>

          {/* Lower Tank Read-Only Card */}
          <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                {t("lowerTank")}
              </h4>
              <span className="text-[10px] font-bold text-slate-400">{t("source")}</span>
            </div>
            <dl className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <dt className="font-semibold text-slate-400 dark:text-slate-500">{t("tankCapacity")}</dt>
                <dd className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {tanks.lower?.capacityLiters ? `${Number(tanks.lower.capacityLiters).toLocaleString()} L` : "—"}
                </dd>
              </div>
              <div>
                <dt className="font-semibold text-slate-400 dark:text-slate-500">{t("usableHeight")}</dt>
                <dd className="mt-1 text-sm font-extrabold text-slate-900 dark:text-slate-100">
                  {tanks.lower?.heightMeters ? `${tanks.lower.heightMeters} m` : "—"}
                </dd>
              </div>
            </dl>
          </div>
        </div>
      ) : (
        /* EDITABLE FORM VIEW */
        <form onSubmit={handleFormSubmit} className="mt-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Upper Tank Form */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-sky-600 dark:text-cyan-400">
                  {t("upperTank")}
                </h4>
                <span className="text-[10px] font-bold text-slate-400">{t("destination")}</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upperCapInput" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("tankCapacity")} (L)
                </label>
                <input
                  id="upperCapInput"
                  type="number"
                  step="any"
                  min="1"
                  max="1000000"
                  value={upperCap}
                  onChange={(e) => setUpperCap(e.target.value)}
                  disabled={!canEdit || isSaving}
                  placeholder="e.g. 10000"
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:opacity-60"
                />
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {t("capacityHelperText")}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="upperHeightInput" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("usableHeight")} (m)
                </label>
                <input
                  id="upperHeightInput"
                  type="number"
                  step="any"
                  min="0.1"
                  max="50"
                  value={upperHeight}
                  onChange={(e) => setUpperHeight(e.target.value)}
                  disabled={!canEdit || isSaving}
                  placeholder="e.g. 5.0"
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:opacity-60"
                />
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {t("heightHelperText")}
                </p>
              </div>
            </div>

            {/* Lower Tank Form */}
            <div className="rounded-2xl border border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/40 p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
                <h4 className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  {t("lowerTank")}
                </h4>
                <span className="text-[10px] font-bold text-slate-400">{t("source")}</span>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lowerCapInput" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("tankCapacity")} (L)
                </label>
                <input
                  id="lowerCapInput"
                  type="number"
                  step="any"
                  min="1"
                  max="1000000"
                  value={lowerCap}
                  onChange={(e) => setLowerCap(e.target.value)}
                  disabled={!canEdit || isSaving}
                  placeholder="e.g. 15000"
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:opacity-60"
                />
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {t("capacityHelperText")}
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="lowerHeightInput" className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {t("usableHeight")} (m)
                </label>
                <input
                  id="lowerHeightInput"
                  type="number"
                  step="any"
                  min="0.1"
                  max="50"
                  value={lowerHeight}
                  onChange={(e) => setLowerHeight(e.target.value)}
                  disabled={!canEdit || isSaving}
                  placeholder="e.g. 4.0"
                  required
                  className="h-10 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm font-bold text-slate-900 dark:text-slate-100 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30 disabled:opacity-60"
                />
                <p className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                  {t("heightHelperText")}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons & Offline Notice */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <p className="text-xs font-medium text-slate-400 dark:text-slate-500">
              {t("offlineSyncNotice")}
            </p>

            {canEdit && (
              <div className="flex items-center gap-3 w-full sm:w-auto">
                {isConfigured && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSaving}
                    className="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-5 text-xs font-extrabold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
                  >
                    <X size={16} aria-hidden="true" />
                    {t("cancel")}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex-1 sm:flex-none inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 text-xs font-extrabold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                      {t("savingConfig")}
                    </>
                  ) : (
                    <>
                      <Check size={16} aria-hidden="true" />
                      {isConfigured ? t("saveChanges") : t("saveConfiguration")}
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </form>
      )}

      {/* CONFIRMATION MODAL DIALOG */}
      {isConfirmModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start gap-4">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-400">
                <AlertTriangle size={22} aria-hidden="true" />
              </span>
              <div>
                <h4 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
                  {t("confirmTankChangeTitle")}
                </h4>
                <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400 leading-relaxed">
                  {t("confirmTankChangeDesc")}
                </p>
              </div>
            </div>

            <div className="rounded-2xl bg-slate-50 dark:bg-slate-950/50 p-4 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">{t("upperTank")}:</span>
                <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                  {upperCap} L / {upperHeight} m
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-bold text-slate-500">{t("lowerTank")}:</span>
                <span className="font-mono font-extrabold text-slate-900 dark:text-slate-100">
                  {lowerCap} L / {lowerHeight} m
                </span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsConfirmModalOpen(false)}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xs font-extrabold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50"
              >
                {t("cancel")}
              </button>
              <button
                type="button"
                onClick={handleConfirmSave}
                disabled={isSaving}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-extrabold text-white transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50"
              >
                {isSaving ? (
                  <>
                    <LoaderCircle size={16} className="animate-spin" aria-hidden="true" />
                    {t("savingConfig")}
                  </>
                ) : (
                  <>
                    <Check size={16} aria-hidden="true" />
                    {t("confirmChanges")}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
