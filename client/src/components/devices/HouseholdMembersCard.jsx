import { useEffect, useState } from "react";
import {
  Eye,
  LoaderCircle,
  Plus,
  Shield,
  Sliders,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from "lucide-react";
import {
  fetchDeviceMembers,
  addDeviceMember,
  updateDeviceMemberRole,
  removeDeviceMember,
} from "../../services/deviceMemberApi";
import { useToast } from "../../context/ToastContext";
import { getApiErrorMessage } from "../../utils/apiError";

export default function HouseholdMembersCard({ deviceId, userRole = "viewer" }) {
  const toast = useToast();

  const isAdmin = userRole === "admin" || userRole === "owner";
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Add Member State
  const [showAddForm, setShowAddForm] = useState(false);
  const [addEmail, setAddEmail] = useState("");
  const [addRole, setAddRole] = useState("controller");
  const [addNickname, setAddNickname] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Updating / Removing State
  const [busyMemberId, setBusyMemberId] = useState(null);
  const [deleteConfirmMemberId, setDeleteConfirmMemberId] = useState(null);

  const loadMembers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchDeviceMembers(deviceId);
      setMembers(data);
    } catch (err) {
      setError(getApiErrorMessage(err, "Unable to load household members."));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (deviceId) {
      loadMembers();
    }
  }, [deviceId]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!addEmail.trim()) {
      toast.error("Please enter an email address.");
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await addDeviceMember(deviceId, {
        email: addEmail.trim(),
        role: addRole,
        nickname: addNickname.trim(),
      });
      toast.success(result.message || "Member added successfully.");
      setAddEmail("");
      setAddNickname("");
      setAddRole("controller");
      setShowAddForm(false);
      await loadMembers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to add member."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChangeRole = async (memberId, currentRole) => {
    const nextRole = currentRole === "controller" ? "viewer" : "controller";
    setBusyMemberId(memberId);
    try {
      await updateDeviceMemberRole(deviceId, memberId, { role: nextRole });
      toast.success(`Role updated to ${nextRole === "controller" ? "Controller" : "Viewer"}.`);
      await loadMembers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to update role."));
    } finally {
      setBusyMemberId(null);
    }
  };

  const handleRemoveMember = async (memberId) => {
    setBusyMemberId(memberId);
    try {
      const result = await removeDeviceMember(deviceId, memberId);
      toast.success(result.message || "Member removed.");
      setDeleteConfirmMemberId(null);
      await loadMembers();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Failed to remove member."));
    } finally {
      setBusyMemberId(null);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case "admin":
      case "owner":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-extrabold text-amber-800 dark:bg-amber-950/70 dark:text-amber-300">
            <Shield size={12} className="shrink-0" />
            Admin
          </span>
        );
      case "controller":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-[11px] font-extrabold text-blue-700 dark:bg-blue-950/70 dark:text-cyan-300">
            <Sliders size={12} className="shrink-0" />
            Controller
          </span>
        );
      case "viewer":
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-700 dark:bg-slate-800 dark:text-slate-300">
            <Eye size={12} className="shrink-0" />
            Viewer
          </span>
        );
    }
  };

  return (
    <section className="rounded-3xl border border-slate-200/80 bg-white/90 p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900/90">
      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-cyan-400">
            <Users size={20} />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-slate-100">
              Household & Access Members
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              Authorized family members sharing access to this water tank.
            </p>
          </div>
        </div>

        {isAdmin && !showAddForm && (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 self-start rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 sm:self-auto"
          >
            <UserPlus size={15} />
            Add Member
          </button>
        )}
      </div>

      {/* Add Member Form (Admin only) */}
      {isAdmin && showAddForm && (
        <form
          onSubmit={handleAddMember}
          className="mt-5 rounded-2xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/40 dark:bg-blue-950/20"
        >
          <div className="flex items-center justify-between border-b border-blue-100/80 pb-3 dark:border-blue-900/40">
            <h4 className="flex items-center gap-2 text-xs font-extrabold text-blue-950 dark:text-blue-200">
              <Plus size={15} className="text-blue-600 dark:text-cyan-400" />
              Invite Household Member by Email
            </h4>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Cancel
            </button>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                User Email <span className="text-rose-500">*</span>
              </label>
              <input
                type="email"
                required
                value={addEmail}
                onChange={(e) => setAddEmail(e.target.value)}
                placeholder="family@example.com"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Permission Level
              </label>
              <select
                value={addRole}
                onChange={(e) => setAddRole(e.target.value)}
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              >
                <option value="controller">Controller (Monitor + Pump Control)</option>
                <option value="viewer">Viewer (Read-only Monitoring)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                Nickname / Label (Optional)
              </label>
              <input
                type="text"
                maxLength={50}
                value={addNickname}
                onChange={(e) => setAddNickname(e.target.value)}
                placeholder="e.g. Dad, Mother, Son"
                className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-1.5 text-xs font-bold text-white transition hover:bg-blue-700 disabled:opacity-50"
            >
              {isSubmitting ? (
                <LoaderCircle size={14} className="animate-spin" />
              ) : (
                <UserCheck size={14} />
              )}
              Add Member
            </button>
          </div>
        </form>
      )}

      {/* Member List */}
      <div className="mt-5 divide-y divide-slate-100 dark:divide-slate-800">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-xs font-semibold text-slate-400">
            <LoaderCircle size={18} className="animate-spin me-2" />
            Loading members...
          </div>
        ) : error ? (
          <div className="py-4 text-center text-xs font-semibold text-rose-500">
            {error}
          </div>
        ) : members.length === 0 ? (
          <div className="py-6 text-center text-xs font-semibold text-slate-400">
            No household members found.
          </div>
        ) : (
          members.map((member) => {
            const isMemberAdmin = member.role === "admin" || member.role === "owner";
            const isBusy = busyMemberId === member.id;
            const isConfirmingDelete = deleteConfirmMemberId === member.id;

            return (
              <div
                key={member.id}
                className="flex flex-col justify-between gap-3 py-3.5 sm:flex-row sm:items-center"
              >
                <div className="flex items-center gap-3">
                  <div className="grid size-9 shrink-0 place-items-center rounded-full bg-slate-100 font-extrabold text-slate-600 uppercase dark:bg-slate-800 dark:text-slate-300">
                    {member.user?.name ? member.user.name.slice(0, 2) : "U"}
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-xs font-bold text-slate-900 dark:text-slate-100">
                        {member.user?.name || member.user?.email || "Unknown User"}
                      </span>
                      {member.nickname && member.nickname.toLowerCase() !== member.role.toLowerCase() && (
                        <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                          {member.nickname}
                        </span>
                      )}
                      {getRoleBadge(member.role)}
                    </div>
                    <p className="truncate text-[11px] font-medium text-slate-400 dark:text-slate-500">
                      {member.user?.email}
                    </p>
                  </div>
                </div>

                {/* Admin Actions */}
                {isAdmin && !isMemberAdmin && (
                  <div className="flex items-center gap-2 self-end sm:self-auto">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400">
                          Remove?
                        </span>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleRemoveMember(member.id)}
                          className="rounded-lg bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 disabled:opacity-50"
                        >
                          {isBusy ? "..." : "Yes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmMemberId(null)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-bold text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleChangeRole(member.id, member.role)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                          title="Switch between Controller and Viewer role"
                        >
                          {isBusy ? (
                            <LoaderCircle size={12} className="animate-spin" />
                          ) : member.role === "controller" ? (
                            <>
                              <Eye size={12} className="text-slate-400" />
                              Make Viewer
                            </>
                          ) : (
                            <>
                              <Sliders size={12} className="text-blue-500" />
                              Make Controller
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => setDeleteConfirmMemberId(member.id)}
                          className="grid size-8 place-items-center rounded-xl text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 dark:hover:bg-rose-950/40 dark:hover:text-rose-400"
                          aria-label="Remove Member"
                        >
                          <Trash2 size={14} />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {!isAdmin && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-3 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
          <span className="font-extrabold text-slate-700 dark:text-slate-300">Note: </span>
          Only the device Admin can add or change permissions for household members.
        </div>
      )}
    </section>
  );
}
