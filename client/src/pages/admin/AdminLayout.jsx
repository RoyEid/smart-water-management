import { Suspense } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Shield } from "lucide-react";
import { ADMIN_SUB_NAV } from "../../components/layout/navigation";
import { LoadingState } from "../../components/ui/StateViews";
import { useLanguage } from "../../context/LanguageContext";
import { useAuth } from "../../context/AuthContext";

/**
 * Chrome for the admin section: the sub-navigation and a standing reminder of
 * who is acting. Reached only through AdminRoute, and every endpoint it calls
 * is independently admin-gated server-side.
 */
export default function AdminLayout() {
  const { t } = useLanguage();
  const { user } = useAuth();

  return (
    <div className="space-y-6">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20">
            <Shield size={22} aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[11px] font-extrabold uppercase tracking-widest text-sky-600 dark:text-cyan-400">
              {t("administration")}
            </p>
            <h2 className="truncate text-xl font-extrabold tracking-tight text-slate-900 sm:text-2xl dark:text-slate-100">
              {t("adminDashboard")}
            </h2>
          </div>
        </div>

        <p className="truncate text-[11px] font-bold text-slate-500 dark:text-slate-400">
          {t("signedInAs", { email: user?.email ?? "" })}
        </p>
      </div>

      {/* Horizontally scrollable on small screens rather than wrapping into a
          tall stack that pushes the content off the fold. */}
      <nav
        aria-label={t("adminNavigation")}
        className="scrollbar-none -mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        {ADMIN_SUB_NAV.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              `shrink-0 rounded-xl px-3.5 py-2 text-xs font-extrabold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                isActive
                  ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                  : "border border-slate-200/80 bg-white text-slate-600 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800"
              }`
            }
          >
            {t(item.labelKey)}
          </NavLink>
        ))}
      </nav>

      {/* Each admin page is its own lazy chunk, so moving between them shows a
          brief loader rather than blocking on the whole section up front. */}
      <Suspense fallback={<LoadingState />}>
        <Outlet />
      </Suspense>
    </div>
  );
}
