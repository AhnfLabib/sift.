// Pure, dependency-free money helpers: cents <-> display string, and
// parsing user-typed dollar strings into integer cents.

const USD_FORMATTER = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

/** 1400 -> "$14.00"; 120000 -> "$1,200.00" (US-style grouping). */
export function formatCents(cents: number): string {
  return USD_FORMATTER.format(cents / 100);
}

// Optional leading "$", digits, optional "." followed by 1-2 decimal digits.
// Deliberately rejects thousands separators, extra decimal places, and
// anything non-numeric.
const DOLLARS_RE = /^\$?(\d+)(?:\.(\d{1,2}))?$/;

/**
 * Parses a user-typed dollar string into integer cents.
 * "14.5" -> 1450; "" -> null; "abc" -> null; "12.345" -> null (too many
 * decimal places); anything resolving to <= 0 -> null.
 */
export function parseDollarsToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  const match = DOLLARS_RE.exec(trimmed);
  if (!match) return null;

  const wholePart = match[1];
  const fractionPart = (match[2] ?? "").padEnd(2, "0");
  const cents = Number(wholePart) * 100 + Number(fractionPart);

  if (!Number.isFinite(cents) || cents <= 0) return null;
  return cents;
}
