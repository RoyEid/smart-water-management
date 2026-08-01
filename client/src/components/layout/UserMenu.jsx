import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, LogOut, Settings, Shield, UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Derives initials for the avatar fallback.
 *
 * Handles the awkward cases a naive split hits: a single-word name, extra
 * whitespace, and an empty name (an OAuth account can have one).
 */
function getInitials(name, email) {
  const source = (name || "").trim() || (email || "").trim();
  if (!source) return "?";

  const words = source.split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
}

export default function UserMenu() {
  const { user, isAdmin, logout } = useAuth();
  const { t, dir } = useLanguage();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const menuId = useId();
  const isRtl = dir === "rtl";

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!containerRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setOpen(false);
        // Focus returns to the trigger so keyboard users are not dropped at
        // the top of the document.
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initials = getInitials(user.name, user.email);
  const roleLabel = isAdmin ? t("adminRole") : t("userRole");

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await logout();
    } finally {
      setLoggingOut(false);
      setOpen(false);
    }
  };

  const itemClasses =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white dark:focus-visible:bg-slate-800";

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={open ? menuId : undefined}
        className="flex h-9 max-w-[11rem] items-center gap-2 rounded-xl border border-slate-200 bg-white px-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 sm:max-w-[14rem] sm:px-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-blue-900/30"
      >
        <Avatar user={user} initials={initials} size="sm" />
        {/* Hidden below sm so a long name cannot squeeze the header on a
            phone; the avatar alone remains the affordance. */}
        <span className="hidden min-w-0 truncate sm:inline">{user.name || user.email}</span>
        <ChevronDown
          size={14}
          className={`hidden shrink-0 text-slate-400 transition-transform sm:inline ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden="true"
        />
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t("accountMenu")}
          // Anchored to the trigger's end edge so it stays on screen in both
          // writing directions and never overflows a narrow viewport.
          className={`absolute top-12 z-50 w-64 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl dark:border-slate-800 dark:bg-slate-900 ${
            isRtl ? "left-0" : "right-0"
          }`}
        >
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
            <Avatar user={user} initials={initials} size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-extrabold text-slate-900 dark:text-slate-100">
                {user.name || t("userRole")}
              </p>
              <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
                {user.email}
              </p>
              <span
                className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide ${
                  isAdmin
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-950/80 dark:text-cyan-300"
                    : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
                }`}
              >
                {isAdmin && <Shield size={10} aria-hidden="true" />}
                {roleLabel}
              </span>
            </div>
          </div>

          <div className="mt-2 space-y-0.5">
            <Link
              to="/settings"
              role="menuitem"
              onClick={() => setOpen(false)}
              className={itemClasses}
            >
              <Settings size={15} className="shrink-0 text-slate-400" aria-hidden="true" />
              {t("settings")}
            </Link>

            {/* Rendered for admins only. The server enforces the same rule, so
                a non-admin who navigates to /admin directly is still refused. */}
            {isAdmin && (
              <Link
                to="/admin"
                role="menuitem"
                onClick={() => setOpen(false)}
                className={itemClasses}
              >
                <Shield size={15} className="shrink-0 text-blue-500 dark:text-cyan-400" aria-hidden="true" />
                {t("adminDashboard")}
              </Link>
            )}

            <button
              type="button"
              role="menuitem"
              onClick={handleLogout}
              disabled={loggingOut}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-xs font-bold text-rose-600 transition hover:bg-rose-50 focus:outline-none focus-visible:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-60 dark:text-rose-400 dark:hover:bg-rose-950/40 dark:focus-visible:bg-rose-950/40"
            >
              <LogOut size={15} className="shrink-0" aria-hidden="true" />
              {loggingOut ? t("loggingOut") : t("logout")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Avatar({ user, initials, size = "sm" }) {
  const sizeClasses = size === "md" ? "size-11 text-sm" : "size-6 text-[10px]";

  if (user.avatar) {
    return (
      <img
        src={user.avatar}
        alt=""
        className={`${sizeClasses} shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700`}
      />
    );
  }

  return (
    <span
      className={`${sizeClasses} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 font-extrabold text-white`}
      aria-hidden="true"
    >
      {initials === "?" ? <UserRound size={size === "md" ? 20 : 12} /> : initials}
    </span>
  );
}
