export default function SettingsCard({ title, description, icon: Icon, children, danger = false }) {
  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm shadow-slate-900/5 sm:p-7 transition-colors ${
        danger
          ? "border-red-200/80 bg-gradient-to-br from-red-50/40 to-white dark:border-red-900/60 dark:from-red-950/30 dark:to-slate-900"
          : "border-slate-200/80 bg-white/90 dark:border-slate-800 dark:bg-slate-900/90"
      }`}
    >
      {(title || Icon) && (
        <div className="mb-5 flex items-center gap-3">
          {Icon && (
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-xl ${
                danger
                  ? "bg-red-100 text-red-600 dark:bg-red-950/80 dark:text-red-400"
                  : "bg-blue-50 text-blue-600 dark:bg-blue-950/80 dark:text-cyan-400"
              }`}
            >
              <Icon size={18} aria-hidden="true" />
            </span>
          )}
          <div className="min-w-0">
            <h3
              className={`text-sm font-extrabold ${
                danger
                  ? "text-red-900 dark:text-red-200"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {title}
            </h3>
            {description && (
              <p className="mt-0.5 text-xs font-medium text-slate-500 dark:text-slate-400">
                {description}
              </p>
            )}
          </div>
        </div>
      )}
      {children}
    </section>
  );
}
