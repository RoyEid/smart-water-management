import { useState } from "react";
import {
  Lock,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  LoaderCircle,
  ShieldCheck,
  LogOut,
  Check,
  Info,
} from "lucide-react";
import SettingsCard from "./SettingsCard";
import api from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

export default function SecuritySection({ user, logout, loggingOut }) {
  const { t } = useLanguage();
  const hasPassword = user?.hasPassword;
  const authProvider = user?.authProvider || "local";

  const [form, setForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const passwordRules = {
    length: form.newPassword.length >= 8,
    uppercase: /[A-Z]/.test(form.newPassword),
    lowercase: /[a-z]/.test(form.newPassword),
    number: /[0-9]/.test(form.newPassword),
  };
  const allValid = Object.values(passwordRules).every(Boolean);

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
    setStatus(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!allValid) {
      setStatus({ type: "error", message: t("pwdRuleLength") });
      return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setStatus({ type: "error", message: t("pwdMismatch") });
      return;
    }
    try {
      setLoading(true);
      setStatus(null);
      const res = await api.patch("/auth/change-password", {
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      });
      setStatus({ type: "success", message: res.data.message });
      setForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (err) {
      setStatus({
        type: "error",
        message: err.response?.data?.message || "Failed to change password.",
      });
    } finally {
      setLoading(false);
    }
  }

  const providerLabel =
    authProvider === "google"
      ? t("google")
      : authProvider === "github"
      ? t("github")
      : "Email & Password";

  return (
    <SettingsCard title={t("security")} description={t("managePasswordSession")} icon={Lock}>
      {/* Auth method */}
      <div className="mb-5 flex items-center gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 p-3 text-xs font-bold text-slate-600 dark:text-slate-300 ring-1 ring-slate-200/80 dark:ring-slate-700/80">
        <ShieldCheck size={15} className="shrink-0 text-blue-600 dark:text-cyan-400" aria-hidden="true" />
        {t("authMethod")}: <span className="text-slate-900 dark:text-slate-100">{providerLabel}</span>
      </div>

      {/* Change password — only if user has a password */}
      {hasPassword ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <h4 className="text-xs font-extrabold text-slate-700 dark:text-slate-300">{t("changePassword")}</h4>

          {/* Current password */}
          <div>
            <label htmlFor="sec-current" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("currentPassword")}
            </label>
            <div className="relative">
              <input
                id="sec-current"
                name="currentPassword"
                type={showCurrent ? "text" : "password"}
                value={form.currentPassword}
                onChange={handleChange}
                autoComplete="current-password"
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-4 pr-12 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                placeholder={t("currentPassword")}
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-cyan-400"
                aria-label={showCurrent ? "Hide password" : "Show password"}
              >
                {showCurrent ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          {/* New password */}
          <div>
            <label htmlFor="sec-new" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("newPassword")}
            </label>
            <div className="relative">
              <input
                id="sec-new"
                name="newPassword"
                type={showNew ? "text" : "password"}
                value={form.newPassword}
                onChange={handleChange}
                autoComplete="new-password"
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-4 pr-12 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                placeholder={t("newPassword")}
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-cyan-400"
                aria-label={showNew ? "Hide password" : "Show password"}
              >
                {showNew ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          {/* Password rules */}
          {form.newPassword && (
            <div className="grid grid-cols-2 gap-2 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 ring-1 ring-slate-200/80 dark:ring-slate-700/80">
              {[
                { key: "length", label: t("pwdRuleLength") },
                { key: "uppercase", label: t("pwdRuleUppercase") },
                { key: "lowercase", label: t("pwdRuleLowercase") },
                { key: "number", label: t("pwdRuleNumber") },
              ].map((rule) => (
                <div
                  key={rule.key}
                  className={`flex items-center gap-1.5 text-[11px] ${
                    passwordRules[rule.key]
                      ? "font-bold text-emerald-700 dark:text-emerald-400"
                      : "text-slate-400 dark:text-slate-500"
                  }`}
                >
                  <span
                    className={`grid size-4 place-items-center rounded-full ${
                      passwordRules[rule.key]
                        ? "bg-emerald-600 dark:bg-emerald-500 text-white"
                        : "border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                    }`}
                  >
                    {passwordRules[rule.key] && <Check size={10} />}
                  </span>
                  {rule.label}
                </div>
              ))}
            </div>
          )}

          {/* Confirm password */}
          <div>
            <label htmlFor="sec-confirm" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("repeatNewPassword")}
            </label>
            <div className="relative">
              <input
                id="sec-confirm"
                name="confirmPassword"
                type={showConfirm ? "text" : "password"}
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-4 pr-12 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 dark:focus:ring-blue-900/30"
                placeholder={t("repeatNewPassword")}
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-blue-50 dark:hover:bg-slate-700 hover:text-blue-700 dark:hover:text-cyan-400"
                aria-label={showConfirm ? "Hide password" : "Show password"}
              >
                {showConfirm ? <Eye size={16} /> : <EyeOff size={16} />}
              </button>
            </div>
          </div>

          {/* Status */}
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

          <button
            type="submit"
            disabled={loading || !form.currentPassword || !form.newPassword || !form.confirmPassword}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-bold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-blue-200 dark:focus:ring-blue-900/30 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {loading ? (
              <>
                <LoaderCircle size={15} className="animate-spin" />
                {t("updating")}
              </>
            ) : (
              t("updatePassword")
            )}
          </button>
        </form>
      ) : (
        <div className="flex items-start gap-3 rounded-xl border border-blue-200 dark:border-blue-900/60 bg-blue-50 dark:bg-blue-950/40 p-4 text-xs font-semibold text-blue-800 dark:text-cyan-300">
          <Info size={16} className="mt-0.5 shrink-0 text-blue-600 dark:text-cyan-400" />
          <div>
            <p className="font-extrabold">{t("pwdNotAvailable")}</p>
            <p className="mt-1 font-medium text-blue-700 dark:text-cyan-200">
              {t("pwdOAuthNotice", { provider: providerLabel })}
            </p>
          </div>
        </div>
      )}

      {/* Divider */}
      <div className="my-5 h-px bg-slate-200 dark:bg-slate-800" />

      {/* Logout */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-extrabold text-slate-800 dark:text-slate-200">{t("activeSession")}</p>
          <p className="text-[11px] font-medium text-slate-500 dark:text-slate-400">
            {t("jwtNotice")}
          </p>
        </div>
        <button
          type="button"
          onClick={logout}
          disabled={loggingOut}
          className="inline-flex h-9 items-center gap-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-xs font-bold text-slate-700 dark:text-slate-200 shadow-sm transition hover:-translate-y-0.5 hover:border-red-200 dark:hover:border-red-800 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-300 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <LogOut size={14} aria-hidden="true" />
          {loggingOut ? t("loggingOut") : t("logout")}
        </button>
      </div>
    </SettingsCard>
  );
}
