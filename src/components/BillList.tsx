"use client";

import { useState, useTransition } from "react";

import type { Bill } from "@/lib/db/types";
import type { deleteBill, upsertBill } from "@/lib/db/mutations";
import { addDaysISO, clampDueDay, monthStart } from "@/lib/domain/dates";
import { formatCents } from "@/lib/domain/money";
import BillForm from "./BillForm";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * First day of the month after `monthISO` (which must itself be a
 * first-of-month "YYYY-MM-01" string). Mirrors queries.ts's private
 * `nextMonthStart` helper — same trick, composed from the exported
 * `addDaysISO`/`monthStart` domain helpers rather than reimplementing
 * calendar math.
 */
function nextMonthStart(monthISO: string): string {
  return monthStart(addDaysISO(monthISO, 31));
}

/**
 * The next occurrence of `dueDay` on/after `todayISO`: this month's clamped
 * day if it hasn't passed yet, else next month's clamped day.
 */
function nextDueISO(dueDay: number, todayISO: string): string {
  const thisMonth = monthStart(todayISO);
  const thisMonthDue = `${thisMonth.slice(0, 8)}${pad2(clampDueDay(dueDay, thisMonth))}`;
  if (thisMonthDue >= todayISO) return thisMonthDue;

  const nextMonth = nextMonthStart(thisMonth);
  return `${nextMonth.slice(0, 8)}${pad2(clampDueDay(dueDay, nextMonth))}`;
}

/** "2026-07-15" -> "Next: Jul 15" */
function formatNextDue(iso: string): string {
  const [, month, day] = iso.split("-").map(Number);
  return `Next: ${MONTH_ABBR[month - 1]} ${day}`;
}

/** 15 -> "15th"; 1 -> "1st"; 22 -> "22nd"; 13 -> "13th". Display-only. */
function ordinal(day: number): string {
  const rem100 = day % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${day}th`;
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

function categoryLabel(categoryId: string | null, categoryNameById: Map<string, string>): string {
  if (categoryId === null) return "Uncategorized";
  return categoryNameById.get(categoryId) ?? "Uncategorized";
}

interface InactiveRowProps {
  bill: Bill;
  categoryNameById: Map<string, string>;
  upsertBill: typeof upsertBill;
}

/** A muted static row for a deactivated bill, with a single Reactivate action. */
function InactiveRow({ bill, categoryNameById, upsertBill }: InactiveRowProps) {
  const [pending, startTransition] = useTransition();

  function handleReactivate() {
    startTransition(async () => {
      await upsertBill({
        id: bill.id,
        name: bill.name,
        amountCents: bill.amount_cents,
        dueDay: bill.due_day,
        categoryId: bill.category_id,
        active: true,
      });
    });
  }

  return (
    <div className="flex items-center justify-between gap-3 border-b border-ink/8 px-4 py-3 text-ink/50 last:border-0">
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{bill.name}</span>
        <span className="block text-[13px]">
          Due on the {ordinal(bill.due_day)} · {categoryLabel(bill.category_id, categoryNameById)}
        </span>
      </span>
      <span className="shrink-0 text-right font-data">{formatCents(bill.amount_cents)}</span>
      <button
        type="button"
        onClick={handleReactivate}
        disabled={pending}
        className="pressable min-h-[44px] shrink-0 rounded-lg bg-banker px-3 text-[13px] font-semibold text-page disabled:opacity-60"
      >
        {pending ? "Reactivating…" : "Reactivate"}
      </button>
    </div>
  );
}

interface Props {
  bills: Bill[];
  categories: { id: string; name: string }[];
  todayISO: string;
  upsertBill: typeof upsertBill;
  deleteBill: typeof deleteBill;
}

/**
 * The bills page's client shell: a paper card of active bills (the record),
 * sorted by next due date, each row opening an inline edit strip on click;
 * a muted paper section of inactive bills below, each with Reactivate.
 */
export default function BillList({ bills, categories, todayISO, upsertBill, deleteBill }: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  const categoryNameById = new Map(categories.map((category) => [category.id, category.name]));

  const active = bills
    .filter((bill) => bill.active)
    .map((bill) => ({ bill, nextDue: nextDueISO(bill.due_day, todayISO) }))
    .sort((a, b) => (a.nextDue < b.nextDue ? -1 : a.nextDue > b.nextDue ? 1 : 0));

  const inactive = bills.filter((bill) => !bill.active);

  return (
    <>
      <section
        aria-label="Active bills"
        className="rounded-xl border border-ink/15 bg-page shadow-[0_2px_8px_rgba(35,39,31,0.10)]"
      >
        {active.length === 0 ? (
          <p className="p-4 text-sm text-ink/55">No bills yet — add one below.</p>
        ) : (
          active.map(({ bill, nextDue }) =>
            editingId === bill.id ? (
              <BillForm
                key={bill.id}
                mode="edit"
                bill={bill}
                categories={categories}
                upsertBill={upsertBill}
                deleteBill={deleteBill}
                onSaved={() => setEditingId(null)}
              />
            ) : (
              <button
                key={bill.id}
                type="button"
                onClick={() => setEditingId(bill.id)}
                className="flex w-full items-center justify-between gap-3 border-b border-ink/8 px-4 py-3 text-left last:border-0 hover:bg-ink/4"
              >
                <span className="min-w-0 flex-1">
                  <span className="block font-semibold">{bill.name}</span>
                  <span className="block text-[13px] text-ink/55">
                    Due on the {ordinal(bill.due_day)} · {categoryLabel(bill.category_id, categoryNameById)}
                  </span>
                </span>
                <span className="shrink-0 text-right">
                  <span className="block font-data">{formatCents(bill.amount_cents)}</span>
                  <span className="block text-[13px] text-ink/55">{formatNextDue(nextDue)}</span>
                </span>
              </button>
            ),
          )
        )}
      </section>

      {inactive.length > 0 ? (
        <div className="mt-4">
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/40">
            Inactive
          </p>
          <section
            aria-label="Inactive bills"
            className="rounded-xl border border-ink/10 bg-ink/4"
          >
            {inactive.map((bill) => (
              <InactiveRow
                key={bill.id}
                bill={bill}
                categoryNameById={categoryNameById}
                upsertBill={upsertBill}
              />
            ))}
          </section>
        </div>
      ) : null}
    </>
  );
}
