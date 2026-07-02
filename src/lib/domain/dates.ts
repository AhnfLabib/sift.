// Pure, dependency-free date helpers. All arithmetic operates on the
// "YYYY-MM-DD" ISO date string via UTC math (Date.UTC / toISOString), never
// via local-time Date constructors, so results never depend on the
// container's timezone.

function parseISODate(isoDate: string): { year: number; month: number; day: number } {
  const [year, month, day] = isoDate.split("-").map(Number);
  return { year, month, day };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/** The caller's local calendar date in `tz`, as "YYYY-MM-DD". */
export function todayInTz(tz: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/** "2026-07-15" -> "2026-07-01" */
export function monthStart(isoDate: string): string {
  return `${isoDate.slice(0, 7)}-01`;
}

/** Adds `days` (may be negative) to `isoDate`, UTC-safe. */
export function addDaysISO(isoDate: string, days: number): string {
  const { year, month, day } = parseISODate(isoDate);
  const ms = Date.UTC(year, month - 1, day) + days * 86_400_000;
  return new Date(ms).toISOString().slice(0, 10);
}

/** Number of days in the (1-indexed) `month` of `year`, UTC-safe. */
function daysInMonth(year: number, month: number): number {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** Clamps `dueDay` to the last valid day of the month containing `isoDateInMonth`. */
export function clampDueDay(dueDay: number, isoDateInMonth: string): number {
  const { year, month } = parseISODate(isoDateInMonth);
  return Math.min(dueDay, daysInMonth(year, month));
}

/** "2026-07-01" -> "2026-06-01"; "2026-01-01" -> "2025-12-01" */
export function prevMonthStart(isoMonthStart: string): string {
  const { year, month } = parseISODate(isoMonthStart);
  const prevYear = month === 1 ? year - 1 : year;
  const prevMonth = month === 1 ? 12 : month - 1;
  return `${prevYear}-${pad2(prevMonth)}-01`;
}
