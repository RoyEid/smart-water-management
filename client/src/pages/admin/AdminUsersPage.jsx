import { useCallback, useEffect, useState } from "react";
import {
  MailCheck,
  MoreVertical,
  Search,
  ShieldCheck,
  ShieldOff,
  Trash2,
  UserCheck,
  UserX,
  Users,
} from "lucide-react";
import Pagination from "../../components/ui/Pagination";
import ConfirmDialog from "../../components/ui/ConfirmDialog";
import {
  EmptyState,
  ErrorState,
  TableSkeleton,
} from "../../components/ui/StateViews";
import { RoleChip } from "./AdminOverviewPage";
import {
  deleteUser,
  fetchAdminUsers,
  resendUserVerification,
  updateUserRole,
  updateUserStatus,
} from "../../services/adminApi";
import useAsyncData from "../../hooks/useAsyncData";
import { useAuth } from "../../context/AuthContext";
import { useLanguage } from "../../context/LanguageContext";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../utils/apiError";
import { formatRelativeAge, formatTimestamp } from "../../utils/telemetryFormat";

export default function AdminUsersPage() {
  const { t, language } = useLanguage();
  const { user: currentUser } = useAuth();
  const toast = useToast();

  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);

  const [pendingAction, setPendingAction] = useState(null);
  const [isActing, setIsActing] = useState(false);

  const loadUsers = useCallback(() => {
    const params = { page, limit: 20 };
    if (search) params.search = search;
    if (role) params.role = role;
    if (status) params.status = status;
    return fetchAdminUsers(params);
  }, [page, search, role, status]);

  const { data, isLoading, error, retry, refresh } = useAsyncData(
    loadUsers,
    [page, search, role, status],
    { fallbackMessage: "Unable to load users." }
  );

  const users = data?.users ?? [];
  const pagination = data?.pagination ?? null;

  // Debounced so typing a name does not fire a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchDraft.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const runAction = async (action, successMessage) => {
    setIsActing(true);
    try {
      const result = await action();
      toast.success(result?.message || successMessage);
      setPendingAction(null);
      refresh();
    } catch (requestError) {
      // The server enforces the last-admin and self-action rules and answers
      // 409 with an explanation; that explanation is what the admin sees.
      toast.error(getApiErrorMessage(requestError, "The action could not be completed."));
    } finally {
      setIsActing(false);
    }
  };

  const inputClasses =
    "h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-800 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:focus:ring-blue-900/30";

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="grid gap-3 rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:grid-cols-2 lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-900/90">
        <label className="relative block min-w-0 sm:col-span-2">
          <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("searchUsers")}
          </span>
          <Search
            size={14}
            className="pointer-events-none absolute bottom-3 start-3 text-slate-400"
            aria-hidden="true"
          />
          <input
            type="search"
            value={searchDraft}
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder={t("searchByNameOrEmail")}
            className={`${inputClasses} ps-9`}
          />
        </label>

        <label className="block min-w-0">
          <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("role")}
          </span>
          <select
            value={role}
            onChange={(event) => {
              setRole(event.target.value);
              setPage(1);
            }}
            className={inputClasses}
          >
            <option value="">{t("allRoles")}</option>
            <option value="admin">{t("adminRole")}</option>
            <option value="user">{t("userRole")}</option>
          </select>
        </label>

        <label className="block min-w-0">
          <span className="mb-1.5 block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {t("status")}
          </span>
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className={inputClasses}
          >
            <option value="">{t("allStatuses")}</option>
            <option value="verified">{t("verified")}</option>
            <option value="unverified">{t("unverified")}</option>
            <option value="active">{t("accountActive")}</option>
            <option value="disabled">{t("accountDisabled")}</option>
          </select>
        </label>
      </div>

      <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
        {isLoading && <TableSkeleton rows={6} columns={5} />}

        {!isLoading && error && (
          <ErrorState message={error} onRetry={retry} retryLabel={t("retry")} />
        )}

        {!isLoading && !error && users.length === 0 && (
          <EmptyState
            icon={Users}
            title={t("noUsersTitle")}
            description={t("noUsersDesc")}
          />
        )}

        {!isLoading && !error && users.length > 0 && (
          <>
            <div className="-mx-5 overflow-x-auto sm:-mx-6">
              <table className="w-full min-w-[48rem] border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:border-slate-800">
                    <th scope="col" className="px-3 py-3 text-start ps-5 sm:ps-6">{t("user")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("role")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("status")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("created")}</th>
                    <th scope="col" className="px-3 py-3 text-start">{t("lastLogin")}</th>
                    <th scope="col" className="px-3 py-3 text-end pe-5 sm:pe-6">
                      <span className="sr-only">{t("actions")}</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800/60">
                  {users.map((user) => (
                    <UserRow
                      key={user.id}
                      user={user}
                      isSelf={user.id === currentUser?.id}
                      onAction={setPendingAction}
                      t={t}
                      language={language}
                    />
                  ))}
                </tbody>
              </table>
            </div>

            <div className="mt-5">
              <Pagination pagination={pagination} onPageChange={setPage} disabled={isLoading} />
            </div>
          </>
        )}
      </section>

      {/* Every destructive or privilege-changing action is confirmed. Deletion
          additionally requires the email to be typed, so a mis-click cannot
          remove an account. */}
      <ConfirmDialog
        open={Boolean(pendingAction)}
        title={pendingAction ? t(pendingAction.titleKey, pendingAction.params) : ""}
        description={pendingAction ? t(pendingAction.descriptionKey, pendingAction.params) : ""}
        confirmLabel={pendingAction ? t(pendingAction.confirmKey) : ""}
        cancelLabel={t("cancel")}
        confirmPhrase={pendingAction?.confirmPhrase ?? null}
        destructive={pendingAction?.destructive !== false}
        loading={isActing}
        onConfirm={() =>
          pendingAction &&
          runAction(pendingAction.action, t(pendingAction.successKey, pendingAction.params))
        }
        onCancel={() => setPendingAction(null)}
      />
    </div>
  );
}

function UserRow({ user, isSelf, onAction, t, language }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const created = formatTimestamp(user.createdAt, { locale: language });
  const lastLogin = formatRelativeAge(user.lastLoginAt, t);

  const closeAndAct = (config) => {
    setMenuOpen(false);
    onAction(config);
  };

  return (
    <tr className="align-middle text-xs font-semibold text-slate-700 transition hover:bg-slate-50/70 dark:text-slate-300 dark:hover:bg-slate-800/40">
      <td className="px-3 py-3 ps-5 sm:ps-6">
        <div className="flex items-center gap-3">
          {user.avatar ? (
            <img
              src={user.avatar}
              alt=""
              className="size-9 shrink-0 rounded-full object-cover ring-1 ring-slate-200 dark:ring-slate-700"
            />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-cyan-400 to-blue-600 text-[10px] font-extrabold text-white">
              {(user.name || user.email).slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate font-extrabold text-slate-900 dark:text-slate-100">
              {user.name}
              {isSelf && (
                <span className="ms-1.5 text-[10px] font-bold text-slate-400">({t("you")})</span>
              )}
            </p>
            <p className="truncate text-[11px] font-medium text-slate-500 dark:text-slate-400">
              {user.email}
            </p>
          </div>
        </div>
      </td>

      <td className="px-3 py-3">
        <RoleChip role={user.role} t={t} />
      </td>

      <td className="px-3 py-3">
        <div className="flex flex-col gap-1">
          <span
            className={`w-fit rounded-full px-2 py-0.5 text-[9px] font-extrabold uppercase ${
              user.isVerified
                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300"
                : "bg-amber-100 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300"
            }`}
          >
            {user.isVerified ? t("verified") : t("unverified")}
          </span>
          {!user.isActive && (
            <span className="w-fit rounded-full bg-rose-100 px-2 py-0.5 text-[9px] font-extrabold uppercase text-rose-700 dark:bg-rose-950/70 dark:text-rose-300">
              {t("accountDisabled")}
            </span>
          )}
        </div>
      </td>

      <td className="whitespace-nowrap px-3 py-3 text-[11px] tabular-nums">
        {created.hasValue ? created.text : "—"}
      </td>

      <td className="whitespace-nowrap px-3 py-3 text-[11px]">
        {lastLogin ?? <span className="text-slate-400">{t("never")}</span>}
      </td>

      <td className="px-3 py-3 pe-5 text-end sm:pe-6">
        <div className="relative inline-block">
          <button
            type="button"
            onClick={() => setMenuOpen((current) => !current)}
            aria-expanded={menuOpen}
            aria-haspopup="menu"
            aria-label={t("userActions", { name: user.name })}
            className="grid size-8 place-items-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <MoreVertical size={16} aria-hidden="true" />
          </button>

          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setMenuOpen(false)}
                aria-hidden="true"
              />
              <div
                role="menu"
                className="absolute end-0 top-9 z-40 w-56 overflow-hidden rounded-2xl border border-slate-200 bg-white p-1.5 text-start shadow-2xl dark:border-slate-800 dark:bg-slate-900"
              >
                <MenuItem
                  icon={user.role === "admin" ? ShieldOff : ShieldCheck}
                  label={user.role === "admin" ? t("demoteToUser") : t("promoteToAdmin")}
                  onClick={() =>
                    closeAndAct({
                      titleKey: user.role === "admin" ? "confirmDemoteTitle" : "confirmPromoteTitle",
                      descriptionKey:
                        user.role === "admin" ? "confirmDemoteDesc" : "confirmPromoteDesc",
                      confirmKey: user.role === "admin" ? "demoteToUser" : "promoteToAdmin",
                      successKey: "roleUpdated",
                      params: { name: user.name },
                      destructive: user.role === "admin",
                      action: () =>
                        updateUserRole(user.id, user.role === "admin" ? "user" : "admin"),
                    })
                  }
                />

                <MenuItem
                  icon={user.isActive ? UserX : UserCheck}
                  label={user.isActive ? t("disableAccount") : t("enableAccount")}
                  // Disabling yourself would lock you out immediately, so the
                  // option is not offered; the server refuses it as well.
                  disabled={isSelf && user.isActive}
                  onClick={() =>
                    closeAndAct({
                      titleKey: user.isActive ? "confirmDisableUserTitle" : "confirmEnableUserTitle",
                      descriptionKey: user.isActive
                        ? "confirmDisableUserDesc"
                        : "confirmEnableUserDesc",
                      confirmKey: user.isActive ? "disableAccount" : "enableAccount",
                      successKey: user.isActive ? "accountDisabledMsg" : "accountEnabledMsg",
                      params: { name: user.name },
                      destructive: user.isActive,
                      action: () => updateUserStatus(user.id, !user.isActive),
                    })
                  }
                />

                {!user.isVerified && (
                  <MenuItem
                    icon={MailCheck}
                    label={t("resendVerification")}
                    onClick={() =>
                      closeAndAct({
                        titleKey: "confirmResendTitle",
                        descriptionKey: "confirmResendDesc",
                        confirmKey: "resendVerification",
                        successKey: "verificationResent",
                        params: { email: user.email },
                        destructive: false,
                        action: () => resendUserVerification(user.id),
                      })
                    }
                  />
                )}

                <MenuItem
                  icon={Trash2}
                  label={t("deleteUser")}
                  danger
                  disabled={isSelf}
                  onClick={() =>
                    closeAndAct({
                      titleKey: "confirmDeleteUserTitle",
                      descriptionKey: "confirmDeleteUserDesc",
                      confirmKey: "deleteUser",
                      successKey: "userDeleted",
                      params: { name: user.name, email: user.email },
                      // Typing the email is required: deletion is permanent.
                      confirmPhrase: user.email,
                      action: () => deleteUser(user.id),
                    })
                  }
                />
              </div>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}

function MenuItem({ icon: Icon, label, onClick, danger = false, disabled = false }) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      disabled={disabled}
      className={`flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-bold transition focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "text-rose-600 hover:bg-rose-50 focus-visible:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
          : "text-slate-600 hover:bg-slate-100 focus-visible:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
      }`}
    >
      <Icon size={14} className="shrink-0" aria-hidden="true" />
      <span className="truncate">{label}</span>
    </button>
  );
}
