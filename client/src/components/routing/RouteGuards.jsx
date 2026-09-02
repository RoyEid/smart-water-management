import { Navigate, Outlet, useLocation } from "react-router-dom";
import { Droplets, ShieldAlert } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Full-page hold while the session is being resolved.
 *
 * Without it, a refresh would render the login page for a split second before
 * /auth/me answers — and worse, the guard would redirect a signed-in user away
 * from the page they had open.
 */
function SessionLoading() {
  const { t } = useLanguage();

  return (
    <div
      className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="grid size-14 animate-pulse place-items-center rounded-3xl bg-gradient-to-br from-cyan-400 to-blue-600 text-white shadow-lg shadow-blue-500/20">
          <Droplets size={28} aria-hidden="true" />
        </span>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
          {t("checkingSession")}
        </p>
      </div>
    </div>
  );
}

/**
 * Requires a signed-in user.
 *
 * The attempted path is carried in location state so login can return the user
 * where they were going instead of always dumping them on the dashboard.
 */
export function ProtectedRoute() {
  const { isLoading, isAuthenticated } = useAuth();
  const location = useLocation();

  if (isLoading) return <SessionLoading />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}


/**
 * Keeps a signed-in user out of the login and register screens, which would
 * otherwise let them "log in" while already logged in.
 */
export function PublicOnlyRoute() {
  const { isLoading, isAuthenticated } = useAuth();

  if (isLoading) return <SessionLoading />;
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <Outlet />;
}

export function ForbiddenNotice({ message }) {
  const { t } = useLanguage();

  return (
    <div
      className="flex flex-col items-center gap-3 rounded-3xl border border-rose-200 bg-rose-50/70 px-6 py-14 text-center dark:border-rose-900/60 dark:bg-rose-950/30"
      role="alert"
    >
      <span className="grid size-12 place-items-center rounded-2xl bg-white text-rose-500 ring-1 ring-rose-200 dark:bg-slate-900 dark:ring-rose-900/60">
        <ShieldAlert size={22} aria-hidden="true" />
      </span>
      <p className="text-sm font-extrabold text-rose-900 dark:text-rose-200">
        {t("accessDenied")}
      </p>
      <p className="max-w-sm text-xs font-medium text-rose-800/80 dark:text-rose-300/80">
        {message || t("accessDeniedDesc")}
      </p>
    </div>
  );
}
