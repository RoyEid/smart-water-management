import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "../../context/LanguageContext";

/**
 * Pagination control shared by every list.
 *
 * Chevron direction follows the writing direction: in Arabic "previous" points
 * right, so a hardcoded left arrow would point at the wrong page.
 */
export default function Pagination({ pagination, onPageChange, disabled = false }) {
  const { t, dir } = useLanguage();
  const isRtl = dir === "rtl";

  if (!pagination || pagination.total === 0) return null;

  const { page, limit, total, totalPages, hasNextPage, hasPreviousPage } = pagination;

  const firstRow = (page - 1) * limit + 1;
  const lastRow = Math.min(page * limit, total);

  const PreviousIcon = isRtl ? ChevronRight : ChevronLeft;
  const NextIcon = isRtl ? ChevronLeft : ChevronRight;

  const buttonClasses =
    "inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus-visible:ring-blue-900/30";

  return (
    <nav
      className="flex flex-col items-center justify-between gap-3 border-t border-slate-100 pt-4 sm:flex-row dark:border-slate-800"
      aria-label={t("pagination")}
    >
      <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
        {t("showingRange", { from: firstRow, to: lastRow, total })}
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={disabled || !hasPreviousPage}
          className={buttonClasses}
        >
          <PreviousIcon size={14} aria-hidden="true" />
          <span className="hidden sm:inline">{t("previous")}</span>
        </button>

        <span
          className="px-2 text-[11px] font-extrabold text-slate-600 dark:text-slate-300"
          // The page number changes without a navigation, so it is announced.
          aria-live="polite"
        >
          {t("pageOf", { page, totalPages })}
        </span>

        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={disabled || !hasNextPage}
          className={buttonClasses}
        >
          <span className="hidden sm:inline">{t("next")}</span>
          <NextIcon size={14} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
