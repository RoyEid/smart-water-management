import { useState, useRef } from "react";
import {
  User,
  Mail,
  Shield,
  Calendar,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  Camera,
} from "lucide-react";
import SettingsCard from "./SettingsCard";
import api from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { fileToAvatarDataUrl } from "../../utils/imageResize";
import { getApiErrorMessage } from "../../utils/apiError";

export default function ProfileSection({ user, onUserUpdate }) {
  const { t, language } = useLanguage();
  const toast = useToast();
  const [name, setName] = useState(user?.name || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);
  const [avatarLoading, setAvatarLoading] = useState(false);
  const fileInputRef = useRef(null);

  // React's documented way to reset a controlled field when the prop behind it
  // changes: compare during render and adjust, rather than writing the value
  // back from an effect after a render has already gone out with the old one.
  const [lastSyncedName, setLastSyncedName] = useState(user?.name || "");
  if (lastSyncedName !== (user?.name || "")) {
    setLastSyncedName(user?.name || "");
    setName(user?.name || "");
  }

  /**
   * Downscales in the browser before upload, so an 8 MP phone photo becomes a
   * small square rather than being rejected by the request size limit.
   */
  async function handleAvatarChange(event) {
    const file = event.target.files?.[0];
    // Cleared immediately so re-selecting the same file still fires onChange.
    event.target.value = "";
    if (!file) return;

    setAvatarLoading(true);
    try {
      const dataUrl = await fileToAvatarDataUrl(file);
      const res = await api.patch("/auth/avatar", { avatar: dataUrl });
      onUserUpdate?.(res.data.user);
      toast.success(res.data.message || t("photoUpdated"));
    } catch (error) {
      // A local processing failure has its own message; a request failure goes
      // through the shared API error mapper.
      toast.error(
        error.response ? getApiErrorMessage(error, t("photoUploadFailed")) : error.message
      );
    } finally {
      setAvatarLoading(false);
    }
  }

  async function handleRemoveAvatar() {
    setAvatarLoading(true);
    try {
      const res = await api.patch("/auth/avatar", { avatar: "" });
      onUserUpdate?.(res.data.user);
      toast.success(res.data.message || t("photoRemoved"));
    } catch (error) {
      toast.error(getApiErrorMessage(error, t("photoUploadFailed")));
    } finally {
      setAvatarLoading(false);
    }
  }

  const initials = (user?.name || "U")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasAvatar = Boolean(user?.avatar);

  async function handleSave(e) {
    e.preventDefault();
    const trimmed = name.trim();

    if (trimmed.length < 2) {
      setStatus({ type: "error", message: t("nameMinErr") });
      return;
    }
    if (trimmed.length > 80) {
      setStatus({ type: "error", message: t("nameMaxErr") });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);
      const res = await api.patch("/auth/profile", { name: trimmed });
      setStatus({ type: "success", message: res.data.message });
      if (onUserUpdate) onUserUpdate(res.data.user);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to update profile.",
      });
    } finally {
      setLoading(false);
    }
  }

  const localeCode =
    language === "ar"
      ? "ar-EG"
      : language === "fr"
      ? "fr-FR"
      : language === "zh"
      ? "zh-CN"
      : "en-US";
  const createdAt = user?.createdAt
    ? new Date(user.createdAt).toLocaleDateString(localeCode, {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : null;

  return (
    <SettingsCard title={t("profileInfo")} description={t("managePersonalDetails")} icon={User}>
      <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Avatar */}
        <div className="flex flex-col items-center gap-2">
          <div className="relative">
            {hasAvatar ? (
              <img
                src={user.avatar}
                alt=""
                className="size-20 rounded-2xl border-2 border-slate-200 object-cover shadow-sm dark:border-slate-700"
              />
            ) : (
              <div className="grid size-20 place-items-center rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-blue-500 to-cyan-500 text-xl font-extrabold text-white shadow-sm dark:border-slate-700">
                {initials}
              </div>
            )}
          </div>

          {/* The real input is visually hidden but still focusable, so the
              styled label works for pointer and keyboard alike. */}
          <input
            ref={fileInputRef}
            id="settings-avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="sr-only"
          />
          <label
            htmlFor="settings-avatar"
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200 transition hover:bg-slate-50 focus-within:ring-2 focus-within:ring-blue-500 dark:text-slate-300 dark:ring-slate-700/80 dark:hover:bg-slate-800 ${
              avatarLoading ? "pointer-events-none opacity-60" : ""
            }`}
          >
            {avatarLoading ? (
              <LoaderCircle size={13} className="animate-spin" aria-hidden="true" />
            ) : (
              <Camera size={13} aria-hidden="true" />
            )}
            {t("uploadPhoto")}
          </label>

          {hasAvatar && (
            <button
              type="button"
              onClick={handleRemoveAvatar}
              disabled={avatarLoading}
              className="text-[11px] font-bold text-rose-600 transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 disabled:opacity-50 dark:text-rose-400"
            >
              {t("removePhoto")}
            </button>
          )}
        </div>

        {/* Profile form */}
        <form onSubmit={handleSave} className="flex-1 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="settings-name"
              className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300"
            >
              {t("fullName")}
            </label>
            <input
              id="settings-name"
              type="text"
              value={name}
              onChange={(e) => { setName(e.target.value); setStatus(null); }}
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
              placeholder={t("yourName")}
            />
          </div>

          {/* Email (read-only) */}
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("emailAddress")}
            </label>
            <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 px-4 text-sm text-slate-600 dark:text-slate-300">
              <Mail size={15} className="shrink-0 text-slate-400 dark:text-slate-500" aria-hidden="true" />
              {user?.email}
            </div>
            <p className="mt-1 text-[11px] font-medium text-slate-400 dark:text-slate-500">
              {t("emailNotice")}
            </p>
          </div>

          {/* Info row */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 dark:bg-blue-950/80 px-2.5 py-1 text-blue-700 dark:text-cyan-300 ring-1 ring-blue-100 dark:ring-blue-900/60">
              <Shield size={12} aria-hidden="true" />
              {user?.role === "admin" ? t("adminRole") : t("userRole")}
            </span>
            {user?.isVerified ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/80 px-2.5 py-1 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-100 dark:ring-emerald-900/60">
                <CheckCircle2 size={12} aria-hidden="true" />
                {t("verified")}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-950/80 px-2.5 py-1 text-amber-700 dark:text-amber-300 ring-1 ring-amber-100 dark:ring-amber-900/60">
                <AlertCircle size={12} aria-hidden="true" />
                {t("unverified")}
              </span>
            )}
            {createdAt && (
              <span className="inline-flex items-center gap-1.5 text-slate-400 dark:text-slate-500">
                <Calendar size={12} aria-hidden="true" />
                {t("joined")} {createdAt}
              </span>
            )}
          </div>

          {/* Status message */}
          {status && (
            <div
              className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-semibold ${
                status.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800/80 dark:bg-emerald-950/50 dark:text-emerald-300"
                  : "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-300"
              }`}
            >
              {status.type === "success" ? (
                <CheckCircle2 size={15} className="shrink-0" />
              ) : (
                <AlertCircle size={15} className="shrink-0" />
              )}
              {status.message}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || name.trim() === user?.name}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <LoaderCircle size={15} className="animate-spin" />
                {t("saving")}
              </>
            ) : (
              t("saveChanges")
            )}
          </button>
        </form>
      </div>
    </SettingsCard>
  );
}
