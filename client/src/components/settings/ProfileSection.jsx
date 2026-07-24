import { useState, useEffect } from "react";
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

export default function ProfileSection({ user, onUserUpdate }) {
  const { t, language } = useLanguage();
  const [name, setName] = useState(user?.name || "");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    setName(user?.name || "");
  }, [user?.name]);

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

  const localeCode = language === "ar" ? "ar-EG" : language === "fr" ? "fr-FR" : "en-US";
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
                alt={user.name}
                className="size-20 rounded-2xl border-2 border-slate-200 dark:border-slate-700 object-cover shadow-sm"
              />
            ) : (
              <div className="grid size-20 place-items-center rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-gradient-to-br from-blue-500 to-cyan-500 text-xl font-extrabold text-white shadow-sm">
                {initials}
              </div>
            )}
          </div>
          <button
            type="button"
            disabled
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold text-slate-400 dark:text-slate-500 ring-1 ring-slate-200 dark:ring-slate-700/80 cursor-not-allowed"
            title={t("soonText")}
          >
            <Camera size={13} aria-hidden="true" />
            {t("uploadPhoto")}
            <span className="rounded bg-cyan-50 dark:bg-cyan-950/80 px-1 py-0.5 text-[9px] font-extrabold uppercase text-cyan-600 dark:text-cyan-400">
              {t("comingSoon")}
            </span>
          </button>
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
