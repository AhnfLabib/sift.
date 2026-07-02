import { describe, expect, it } from "vitest";
import { computeReminders, LEAD_DAYS, type ReminderCandidate } from "./compute";

type BillRow = {
  id: string;
  name: string;
  amount_cents: number;
  due_day: number;
  active: boolean;
};

function bill(overrides: Partial<BillRow> = {}): BillRow {
  return {
    id: "bill-1",
    name: "Rent",
    amount_cents: 120000,
    due_day: 15,
    active: true,
    ...overrides,
  };
}

describe("LEAD_DAYS", () => {
  it("is [3, 1]", () => {
    expect(LEAD_DAYS).toEqual([3, 1]);
  });
});

describe("computeReminders", () => {
  it("due_day 15, today 2026-07-12 -> one hit (lead 3, due 2026-07-15)", () => {
    const result = computeReminders([bill({ due_day: 15 })], "2026-07-12");
    expect(result).toEqual<ReminderCandidate[]>([
      {
        billId: "bill-1",
        billName: "Rent",
        amountCents: 120000,
        dueDate: "2026-07-15",
        leadDays: 3,
      },
    ]);
  });

  it("due_day 15, today 2026-07-14 -> one hit (lead 1, due 2026-07-15)", () => {
    const result = computeReminders([bill({ due_day: 15 })], "2026-07-14");
    expect(result).toEqual<ReminderCandidate[]>([
      {
        billId: "bill-1",
        billName: "Rent",
        amountCents: 120000,
        dueDate: "2026-07-15",
        leadDays: 1,
      },
    ]);
  });

  it("due_day 15, today 2026-07-13 -> no hits", () => {
    expect(computeReminders([bill({ due_day: 15 })], "2026-07-13")).toEqual([]);
  });

  it("due_day 31, today 2026-02-25 (non-leap) -> lead 3 hits with dueDate 2026-02-28", () => {
    const result = computeReminders([bill({ due_day: 31 })], "2026-02-25");
    expect(result).toEqual<ReminderCandidate[]>([
      {
        billId: "bill-1",
        billName: "Rent",
        amountCents: 120000,
        dueDate: "2026-02-28",
        leadDays: 3,
      },
    ]);
  });

  it("due_day 1, today 2026-07-29 -> lead 3 hits with dueDate 2026-08-01 (month rollover)", () => {
    const result = computeReminders([bill({ due_day: 1 })], "2026-07-29");
    expect(result).toEqual<ReminderCandidate[]>([
      {
        billId: "bill-1",
        billName: "Rent",
        amountCents: 120000,
        dueDate: "2026-08-01",
        leadDays: 3,
      },
    ]);
  });

  it("inactive bill is never a candidate (even on a matching day)", () => {
    expect(
      computeReminders([bill({ due_day: 15, active: false })], "2026-07-12")
    ).toEqual([]);
  });

  it("a single bill can hit on both lead days across separate runs but only one per run", () => {
    // The same bill only ever produces one candidate per invocation.
    const lead3 = computeReminders([bill({ due_day: 15 })], "2026-07-12");
    const lead1 = computeReminders([bill({ due_day: 15 })], "2026-07-14");
    expect(lead3).toHaveLength(1);
    expect(lead1).toHaveLength(1);
    expect(lead3[0].leadDays).toBe(3);
    expect(lead1[0].leadDays).toBe(1);
  });

  it("multiple bills each yield their own candidates independently", () => {
    const bills = [
      bill({ id: "a", name: "Rent", due_day: 15 }), // lead 3 hit on 2026-07-12
      bill({ id: "b", name: "Gym", due_day: 13, amount_cents: 4500 }), // lead 1 hit on 2026-07-12
      bill({ id: "c", name: "Netflix", due_day: 20 }), // no hit
    ];
    const result = computeReminders(bills, "2026-07-12");
    expect(result).toEqual<ReminderCandidate[]>([
      {
        billId: "a",
        billName: "Rent",
        amountCents: 120000,
        dueDate: "2026-07-15",
        leadDays: 3,
      },
      {
        billId: "b",
        billName: "Gym",
        amountCents: 4500,
        dueDate: "2026-07-13",
        leadDays: 1,
      },
    ]);
  });

  it("due_day 31 in a 30-day month clamps: today 2026-04-27 -> lead 3 due 2026-04-30", () => {
    const result = computeReminders([bill({ due_day: 31 })], "2026-04-27");
    expect(result).toEqual<ReminderCandidate[]>([
      {
        billId: "bill-1",
        billName: "Rent",
        amountCents: 120000,
        dueDate: "2026-04-30",
        leadDays: 3,
      },
    ]);
  });

  it("year rollover: due_day 1, today 2026-12-29 -> lead 3 due 2027-01-01", () => {
    const result = computeReminders([bill({ due_day: 1 })], "2026-12-29");
    expect(result).toEqual<ReminderCandidate[]>([
      {
        billId: "bill-1",
        billName: "Rent",
        amountCents: 120000,
        dueDate: "2027-01-01",
        leadDays: 3,
      },
    ]);
  });

  it("empty bills -> no candidates", () => {
    expect(computeReminders([], "2026-07-12")).toEqual([]);
  });
});
