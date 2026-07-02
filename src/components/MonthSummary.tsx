import { formatCents } from "@/lib/domain/money";
import type { copyLastMonthBudgets } from "@/lib/db/mutations";
import type { MonthSummary as MonthSummaryData } from "@/lib/domain/summary";
import BudgetBar from "./BudgetBar";
import CopyBudgetsButton from "./CopyBudgetsButton";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** "2026-07-01" -> "July 2026" */
function formatMonthLabel(monthISO: string): string {
  const [year, month] = monthISO.split("-").map(Number);
  return `${MONTH_NAMES[month - 1]} ${year}`;
}

interface Props {
  summary: MonthSummaryData;
  monthISO: string;
  hasBudgetsThisMonth: boolean;
  hasBudgetsLastMonth: boolean;
  copyLastMonthBudgets: typeof copyLastMonthBudgets;
}

/**
 * Left panel (glass): the month's running total, per-category budget bars,
 * the uncategorized nudge, and the copy-last-month's-budgets button.
 */
export default function MonthSummary({
  summary,
  monthISO,
  hasBudgetsThisMonth,
  hasBudgetsLastMonth,
  copyLastMonthBudgets,
}: Props) {
  // Uncategorized spend is surfaced via the nudge below, not as a bar-less
  // budget row (it can never have a limit).
  const budgetedCategories = summary.categories.filter((c) => c.categoryId !== null);
  const showCopyBudgets = !hasBudgetsThisMonth && hasBudgetsLastMonth;
  const uncategorizedCount = summary.uncategorizedCount;

  return (
    <section className="glass" aria-labelledby="month-h">
      <p
        id="month-h"
        className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/55"
      >
        {formatMonthLabel(monthISO)} · Spent so far
      </p>
      <p className="font-display text-[40px] font-bold leading-[1.1] tracking-[-0.01em]">
        {formatCents(summary.totalSpentCents)}
      </p>
      <p className="mb-6 mt-0.5 min-h-[1.25rem] text-sm text-ink/55">
        {summary.totalLimitCents > 0 ? (
          <>
            of{" "}
            <strong className="font-semibold text-ink">
              {formatCents(summary.totalLimitCents)}
            </strong>{" "}
            budgeted
          </>
        ) : null}
      </p>

      {budgetedCategories.map((category) => (
        <BudgetBar
          key={category.categoryId ?? category.name}
          name={category.name}
          spentCents={category.spentCents}
          limitCents={category.limitCents}
        />
      ))}

      {showCopyBudgets ? <CopyBudgetsButton action={copyLastMonthBudgets} /> : null}

      {uncategorizedCount > 0 ? (
        <p className="mt-5 rounded-lg border border-dashed border-ink/25 px-3.5 py-3 text-[13.5px] text-ink/55">
          {uncategorizedCount} {uncategorizedCount === 1 ? "entry" : "entries"} this month{" "}
          {uncategorizedCount === 1 ? "has" : "have"} no category —{" "}
          <a href="#ledger-h" className="font-semibold text-banker">
            tag them
          </a>{" "}
          and sift. remembers next time.
        </p>
      ) : null}
    </section>
  );
}
