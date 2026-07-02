import { describe, expect, it } from "vitest";
import { summarizeMonth } from "./summary";

const CATEGORIES = [
  { id: "food", name: "Food", icon: "🍔" },
  { id: "transit", name: "Transit", icon: "🚌" },
  { id: "coffee", name: "Coffee", icon: "☕" },
  { id: "subscriptions", name: "Subscriptions", icon: "📺" },
];

describe("summarizeMonth", () => {
  it("orders categories + uncategorized pseudo-entry by spentCents desc, totals correctly, and excludes categories with no spend/budget", () => {
    const transactions = [
      { amount_cents: 3000, category_id: "food" },
      { amount_cents: 2000, category_id: "food" },
      { amount_cents: 1000, category_id: "transit" },
      { amount_cents: 900, category_id: null },
      { amount_cents: 600, category_id: null },
    ];
    const budgets = [
      { category_id: "food", limit_cents: 6000 },
      { category_id: "transit", limit_cents: 500 },
      { category_id: "subscriptions", limit_cents: 2000 },
    ];

    const result = summarizeMonth(transactions, budgets, CATEGORIES);

    // food (5000) > uncategorized (1500) > transit (1000) > subscriptions (0, budget-only)
    // "coffee" has neither spend nor budget, so it must not appear at all.
    expect(result.categories).toEqual([
      { categoryId: "food", name: "Food", icon: "🍔", spentCents: 5000, limitCents: 6000 },
      { categoryId: null, name: "Uncategorized", icon: "❓", spentCents: 1500, limitCents: null },
      { categoryId: "transit", name: "Transit", icon: "🚌", spentCents: 1000, limitCents: 500 },
      {
        categoryId: "subscriptions",
        name: "Subscriptions",
        icon: "📺",
        spentCents: 0,
        limitCents: 2000,
      },
    ]);

    expect(result.totalSpentCents).toBe(7500); // 5000 + 1000 + 1500 (includes uncategorized)
    expect(result.totalLimitCents).toBe(8500); // 6000 + 500 + 2000 (budgets only)
    expect(result.uncategorizedCount).toBe(2);
  });

  it("omits the Uncategorized pseudo-entry when there is no uncategorized spend", () => {
    const transactions = [{ amount_cents: 1000, category_id: "food" }];
    const budgets = [{ category_id: "food", limit_cents: 5000 }];

    const result = summarizeMonth(transactions, budgets, CATEGORIES);

    expect(result.categories).toEqual([
      { categoryId: "food", name: "Food", icon: "🍔", spentCents: 1000, limitCents: 5000 },
    ]);
    expect(result.uncategorizedCount).toBe(0);
  });

  it("returns an empty summary for no transactions and no budgets", () => {
    const result = summarizeMonth([], [], CATEGORIES);

    expect(result).toEqual({
      totalSpentCents: 0,
      totalLimitCents: 0,
      categories: [],
      uncategorizedCount: 0,
    });
  });
});
