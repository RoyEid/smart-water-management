import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Trash2, AlertCircle } from "lucide-react";
import SettingsCard from "./SettingsCard";
import ConfirmDeleteModal from "./ConfirmDeleteModal";
import api from "../../services/api";
import { useLanguage } from "../../context/LanguageContext";

export default function DangerZoneSection({ user }) {
  const { t } = useLanguage();
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function handleDelete({ password, confirmText }) {
    try {
      setLoading(true);
      setError("");
      await api.delete("/auth/account", {
        data: { password: password || undefined, confirmText },
      });
      navigate("/register", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to delete account.");
      setLoading(false);
    }
  }

  return (
    <SettingsCard
      title={t("dangerZone")}
      description={t("irreversibleActions")}
      icon={Trash2}
      danger
    >
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-extrabold text-red-900 dark:text-red-300">{t("deleteAccount")}</p>
          <p className="text-xs font-medium text-red-700/80 dark:text-red-400/80">
            {t("deleteAccountDesc")}
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowModal(true); setError(""); }}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-red-300 dark:border-red-800 bg-white dark:bg-slate-800 px-5 text-xs font-bold text-red-700 dark:text-red-300 shadow-sm transition hover:-translate-y-0.5 hover:bg-red-50 dark:hover:bg-red-950/50 hover:shadow-md focus:outline-none focus:ring-4 focus:ring-red-100 dark:focus:ring-red-900/30"
        >
          <Trash2 size={14} aria-hidden="true" />
          {t("deleteAccount")}
        </button>
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-900/60 bg-red-50 dark:bg-red-950/40 p-3 text-xs font-semibold text-red-700 dark:text-red-300">
          <AlertCircle size={15} className="shrink-0" />
          {error}
        </div>
      )}

      {showModal && (
        <ConfirmDeleteModal
          hasPassword={user?.hasPassword}
          loading={loading}
          onConfirm={handleDelete}
          onCancel={() => setShowModal(false)}
        />
      )}
    </SettingsCard>
  );
}
