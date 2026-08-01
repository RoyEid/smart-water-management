import { useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle, X } from "lucide-react";

/**
 * Confirmation modal for anything destructive or hard to undo.
 *
 * Two safety levels: a plain confirm, and — when `confirmPhrase` is given — one
 * that requires the phrase to be typed, for actions like deleting an account
 * where a mis-click must not be enough.
 */
/**
 * Mounts the dialog body only while it is open.
 *
 * The typed confirmation phrase therefore starts empty on every open as a
 * consequence of mounting, instead of being cleared by an effect after the
 * dialog has already rendered once with the previous value.
 */
export default function ConfirmDialog({ open, ...props }) {
  if (!open) return null;
  return <ConfirmDialogBody {...props} />;
}

function ConfirmDialogBody({
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmPhrase = null,
  destructive = true,
  loading = false,
  onConfirm,
  onCancel,
}) {
  const [typed, setTyped] = useState("");
  const dialogRef = useRef(null);
  const confirmButtonRef = useRef(null);
  const phraseInputRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();

  useEffect(() => {
    // Focus moves into the dialog so a keyboard user is not left tabbing
    // through the page behind it. The phrase field takes priority when present
    // because it is the next thing the user must do.
    const focusTarget = confirmPhrase ? phraseInputRef.current : confirmButtonRef.current;
    focusTarget?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !loading) {
        event.preventDefault();
        onCancel?.();
        return;
      }

      if (event.key !== "Tab") return;

      // Focus trap: Tab from the last control returns to the first rather than
      // escaping to the page underneath.
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [loading, onCancel, confirmPhrase]);

  const phraseSatisfied = !confirmPhrase || typed.trim() === confirmPhrase;
  const canConfirm = phraseSatisfied && !loading;

  const confirmClasses = destructive
    ? "bg-rose-600 hover:bg-rose-700 focus-visible:ring-rose-300 dark:focus-visible:ring-rose-900/50"
    : "bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-200 dark:focus-visible:ring-blue-900/40";

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center p-4 sm:items-center">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm"
        onClick={loading ? undefined : onCancel}
        aria-hidden="true"
      />

      <div
        ref={dialogRef}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start gap-3">
          <span
            className={`grid size-10 shrink-0 place-items-center rounded-2xl ${
              destructive
                ? "bg-rose-50 text-rose-600 dark:bg-rose-950/70 dark:text-rose-400"
                : "bg-blue-50 text-blue-600 dark:bg-blue-950/70 dark:text-cyan-400"
            }`}
          >
            <AlertTriangle size={20} aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h2
              id={titleId}
              className="text-sm font-extrabold text-slate-900 dark:text-slate-100"
            >
              {title}
            </h2>
            {description && (
              <p
                id={descriptionId}
                className="mt-1.5 text-xs font-medium leading-relaxed text-slate-600 dark:text-slate-400"
              >
                {description}
              </p>
            )}
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            aria-label={cancelLabel}
            className="-me-1 -mt-1 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:opacity-50 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>

        {confirmPhrase && (
          <div className="mt-5">
            <label
              htmlFor={`${titleId}-phrase`}
              className="block text-[11px] font-extrabold uppercase tracking-wide text-slate-500 dark:text-slate-400"
            >
              Type <span className="font-mono text-rose-600 dark:text-rose-400">{confirmPhrase}</span> to confirm
            </label>
            <input
              id={`${titleId}-phrase`}
              ref={phraseInputRef}
              type="text"
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              autoComplete="off"
              className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 font-mono text-sm font-bold text-slate-900 outline-none transition focus:border-rose-400 focus:ring-4 focus:ring-rose-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 dark:focus:ring-rose-900/40"
            />
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-slate-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-slate-700"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            ref={confirmButtonRef}
            onClick={onConfirm}
            disabled={!canConfirm}
            className={`inline-flex h-10 items-center justify-center gap-2 rounded-xl px-5 text-xs font-bold text-white shadow-sm transition focus:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-50 ${confirmClasses}`}
          >
            {loading && (
              <LoaderCircle size={14} className="animate-spin" aria-hidden="true" />
            )}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
