import { addDaysISO, clampDueDay } from "@/lib/domain/dates";

export interface ReminderCandidate {
  billId: string;
  billName: string;
  amountCents: number;
  dueDate: string;
  leadDays: number;
}

export const LEAD_DAYS = [3, 1] as const;

/** Day-of-month (1-31) of a "YYYY-MM-DD" string. */
function dayOfMonth(isoDate: string): number {
  return Number(isoDate.slice(8, 10));
}

/**
 * For each active bill and each lead in LEAD_DAYS, the reminder fires when the
 * bill's (month-clamped) due day equals the day-of-month of `today + lead`.
 * Returns one candidate per (bill, lead) hit. Deterministic, timezone-free.
 */
export function computeReminders(
  bills: {
    id: string;
    name: string;
    amount_cents: number;
    due_day: number;
    active: boolean;
  }[],
  todayISO: string
): ReminderCandidate[] {
  const candidates: ReminderCandidate[] = [];

  for (const bill of bills) {
    if (!bill.active) continue;

    for (const leadDays of LEAD_DAYS) {
      const dueDate = addDaysISO(todayISO, leadDays);
      if (clampDueDay(bill.due_day, dueDate) === dayOfMonth(dueDate)) {
        candidates.push({
          billId: bill.id,
          billName: bill.name,
          amountCents: bill.amount_cents,
          dueDate,
          leadDays,
        });
      }
    }
  }

  return candidates;
}
