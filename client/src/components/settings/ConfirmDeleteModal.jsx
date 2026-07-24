import { useState } from "react";
import { AlertTriangle, X, LoaderCircle, Eye, EyeOff } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

export default function ConfirmDeleteModal({ hasPassword, onConfirm, onCancel, loading }) {
  const { t } = useLanguage();
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const canSubmit = hasPassword
    ? confirmText === "DELETE" && password.length > 0
    : confirmText === "DELETE";

  function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    onConfirm({ password, confirmText });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal */}
      <div className="relative w-full max-w-md rounded-2xl border border-red-200 dark:border-red-900/60 bg-white dark:bg-slate-900 p-6 shadow-2xl sm:p-8">
        <button
          type="button"
          onClick={onCancel}
          className="absolute right-4 top-4 rounded-lg p-1 text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="mb-5 flex items-center gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-red-100 dark:bg-red-950/80 text-red-600 dark:text-red-400">
            <AlertTriangle size={20} aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-red-900 dark:text-red-200">{t("deleteAccount")}</h3>
            <p className="text-xs font-medium text-red-600 dark:text-red-400">
              {t("deleteAccountDesc")}
            </p>
          </div>
        </div>

        <div className="mb-5 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs font-semibold text-red-800 dark:text-red-300">
          {t("deleteWarningMsg")}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type DELETE */}
          <div>
            <label htmlFor="del-confirm" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
              {t("typeDeleteToConfirm")}
            </label>
            <input
              id="del-confirm"
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-4 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30"
              placeholder="DELETE"
              autoComplete="off"
            />
          </div>

          {/* Password (for local users) */}
          {hasPassword && (
            <div>
              <label htmlFor="del-password" className="mb-1.5 block text-xs font-bold text-slate-700 dark:text-slate-300">
                {t("enterYourPassword")}
              </label>
              <div className="relative">
                <input
                  id="del-password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 pl-4 pr-12 text-sm text-slate-900 dark:text-slate-100 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30"
                  placeholder={t("enterYourPassword")}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-1 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:bg-red-50 dark:hover:bg-slate-700 hover:text-red-600 dark:hover:text-red-400"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <Eye size={16} /> : <EyeOff size={16} />}
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 transition hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              {t("cancel")}
            </button>
            <button
              type="submit"
              disabled={!canSubmit || loading}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-2.5 text-xs font-bold text-white transition hover:bg-red-700 focus:outline-none focus:ring-4 focus:ring-red-200 dark:focus:ring-red-900/30 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <LoaderCircle size={14} className="animate-spin" />
                  {t("deleting")}
                </>
              ) : (
                t("deleteMyAccount")
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
