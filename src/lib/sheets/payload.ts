// Pure builders for the Google Sheets export payloads. Amounts leave the
// integer-cents world only here, at the presentation boundary: Sheets gets
// plain dollar numbers (1450 -> 14.5) so the columns are usable as numbers.

import type { Transaction } from "@/lib/db/types";

function centsToDollars(cents: number): number {
  return cents / 100;
}

/**
 * One row per transaction (input order preserved) under the header
 * ["Date","Merchant","Category","Amount","Source","Raw input"].
 */
export function buildTransactionsRows(
  txs: (Transaction & { category: { name: string } | null })[],
): (string | number)[][] {
  const header = ["Date", "Merchant", "Category", "Amount", "Source", "Raw input"];
  const rows = txs.map((tx) => [
    tx.date,
    tx.merchant,
    tx.category?.name ?? "",
    centsToDollars(tx.amount_cents),
    tx.source,
    tx.raw_input ?? "",
  ]);
  return [header, ...rows];
}

/**
 * Month × category pivot: header ["Month", ...categoryNames sorted alpha,
 * "Total"], one row per month ascending, cells zero-filled where a month
 * has no spend in a category. `byCategory` values are cents.
 */
export function buildSummaryRows(
  months: { month: string; byCategory: Record<string, number> }[],
): (string | number)[][] {
  const categoryNames = [
    ...new Set(months.flatMap((m) => Object.keys(m.byCategory))),
  ].sort();

  const header = ["Month", ...categoryNames, "Total"];
  const rows = [...months]
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((m) => {
      const cells = categoryNames.map((name) =>
        centsToDollars(m.byCategory[name] ?? 0),
      );
      const total = cells.reduce((sum, dollars) => sum + dollars, 0);
      return [m.month, ...cells, total];
    });
  return [header, ...rows];
}
