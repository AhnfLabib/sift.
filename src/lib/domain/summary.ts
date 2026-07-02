// Pure, dependency-free month-summary aggregation for the dashboard.

export interface CategorySummary {
  categoryId: string | null;
  name: string;
  icon: string;
  spentCents: number;
  limitCents: number | null;
}

export interface MonthSummary {
  totalSpentCents: number;
  totalLimitCents: number;
  categories: CategorySummary[];
  uncategorizedCount: number;
}

const UNCATEGORIZED_ICON = "❓";
const UNCATEGORIZED_NAME = "Uncategorized";

export function summarizeMonth(
  transactions: { amount_cents: number; category_id: string | null }[],
  budgets: { category_id: string; limit_cents: number }[],
  categories: { id: string; name: string; icon: string }[],
): MonthSummary {
  const spentByCategory = new Map<string, number>();
  let uncategorizedSpentCents = 0;
  let uncategorizedCount = 0;
  let totalSpentCents = 0;

  for (const transaction of transactions) {
    totalSpentCents += transaction.amount_cents;
    if (transaction.category_id === null) {
      uncategorizedSpentCents += transaction.amount_cents;
      uncategorizedCount += 1;
    } else {
      spentByCategory.set(
        transaction.category_id,
        (spentByCategory.get(transaction.category_id) ?? 0) + transaction.amount_cents,
      );
    }
  }

  const limitByCategory = new Map<string, number>();
  let totalLimitCents = 0;
  for (const budget of budgets) {
    limitByCategory.set(budget.category_id, budget.limit_cents);
    totalLimitCents += budget.limit_cents;
  }

  const categoryById = new Map(categories.map((category) => [category.id, category]));

  const relevantCategoryIds = new Set<string>([
    ...spentByCategory.keys(),
    ...limitByCategory.keys(),
  ]);

  const categorySummaries: CategorySummary[] = [];
  for (const categoryId of relevantCategoryIds) {
    const category = categoryById.get(categoryId);
    categorySummaries.push({
      categoryId,
      name: category?.name ?? categoryId,
      icon: category?.icon ?? "",
      spentCents: spentByCategory.get(categoryId) ?? 0,
      limitCents: limitByCategory.get(categoryId) ?? null,
    });
  }

  if (uncategorizedSpentCents > 0) {
    categorySummaries.push({
      categoryId: null,
      name: UNCATEGORIZED_NAME,
      icon: UNCATEGORIZED_ICON,
      spentCents: uncategorizedSpentCents,
      limitCents: null,
    });
  }

  categorySummaries.sort((a, b) => b.spentCents - a.spentCents);

  return {
    totalSpentCents,
    totalLimitCents,
    categories: categorySummaries,
    uncategorizedCount,
  };
}
