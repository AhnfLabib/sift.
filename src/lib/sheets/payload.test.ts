import { describe, expect, it } from "vitest";
import { buildSummaryRows, buildTransactionsRows } from "./payload";
import type { Transaction } from "@/lib/db/types";

function tx(
  overrides: Partial<Transaction> & { category?: { name: string } | null } = {},
): Transaction & { category: { name: string } | null } {
  return {
    id: "tx-1",
    user_id: "user-1",
    amount_cents: 1400,
    merchant: "Chipotle",
    category_id: "cat-food",
    date: "2026-07-02",
    source: "web",
    raw_input: null,
    created_at: "2026-07-02T12:00:00Z",
    category: { name: "Food" },
    ...overrides,
  };
}

describe("buildTransactionsRows", () => {
  it("starts with the exact header row", () => {
    expect(buildTransactionsRows([])[0]).toEqual([
      "Date",
      "Merchant",
      "Category",
      "Amount",
      "Source",
      "Raw input",
    ]);
  });

  it("converts cents to dollar numbers (1450 -> 14.5)", () => {
    const rows = buildTransactionsRows([tx({ amount_cents: 1450 })]);
    expect(rows[1][3]).toBe(14.5);
  });

  it("maps a full transaction to [date, merchant, category, amount, source, raw]", () => {
    const rows = buildTransactionsRows([
      tx({
        amount_cents: 1400,
        merchant: "Chipotle",
        date: "2026-07-02",
        source: "chat",
        raw_input: "$14 chipotle",
        category: { name: "Food" },
      }),
    ]);
    expect(rows[1]).toEqual([
      "2026-07-02",
      "Chipotle",
      "Food",
      14,
      "chat",
      "$14 chipotle",
    ]);
  });

  it("renders null category as empty string", () => {
    const rows = buildTransactionsRows([tx({ category: null })]);
    expect(rows[1][2]).toBe("");
  });

  it("renders null raw_input as empty string", () => {
    const rows = buildTransactionsRows([tx({ raw_input: null })]);
    expect(rows[1][5]).toBe("");
  });

  it("keeps one row per transaction, in input order", () => {
    const rows = buildTransactionsRows([
      tx({ merchant: "First" }),
      tx({ merchant: "Second" }),
    ]);
    expect(rows).toHaveLength(3);
    expect(rows[1][1]).toBe("First");
    expect(rows[2][1]).toBe("Second");
  });
});

describe("buildSummaryRows", () => {
  it("pivots months x categories with alpha-sorted headers, zero-fill, and totals", () => {
    const rows = buildSummaryRows([
      { month: "2026-07", byCategory: { Food: 1450, Transit: 2300 } },
      { month: "2026-06", byCategory: { Rent: 120000, Food: 500 } },
    ]);
    expect(rows).toEqual([
      ["Month", "Food", "Rent", "Transit", "Total"],
      ["2026-06", 5, 1200, 0, 1205],
      ["2026-07", 14.5, 0, 23, 37.5],
    ]);
  });

  it("returns just the minimal header when there are no months", () => {
    expect(buildSummaryRows([])).toEqual([["Month", "Total"]]);
  });

  it("totals in cents, avoiding float drift (1010 + 2020 -> 30.3, not 30.299999…)", () => {
    const rows = buildSummaryRows([
      { month: "2026-07", byCategory: { Food: 1010, Transit: 2020 } },
    ]);
    expect(rows[1]).toEqual(["2026-07", 10.1, 20.2, 30.3]);
  });
});
