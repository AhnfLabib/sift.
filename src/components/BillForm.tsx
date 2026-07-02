"use client";

import { useId, useState, useTransition } from "react";

import type { Bill } from "@/lib/db/types";
import type { deleteBill, upsertBill } from "@/lib/db/mutations";
import { parseDollarsToCents } from "@/lib/domain/money";

/** 1400 -> "14.00" (editable input value, no grouping separators). */
function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

interface Props {
  mode: "create" | "edit";
  /** Required (and only used) in edit mode. */
  bill?: Bill;
  categories: { id: string; name: string }[];
  upsertBill: typeof upsertBill;
  /** Required (and only used) in edit mode. */
  deleteBill?: typeof deleteBill;
  /** Edit mode: called after a successful Save, Deactivate, or Delete. */
  onSaved?: () => void;
}

/**
 * The bill form, in two skins: a glass "Add bill" panel (create mode) or a
 * paper inline edit strip (edit mode, matching LedgerRow's row-edit idiom),
 * with Deactivate and a two-click-confirm Delete alongside Save.
 */
export default function BillForm({
  mode,
  bill,
  categories,
  upsertBill,
  deleteBill,
  onSaved,
}: Props) {
  const isEdit = mode === "edit";
  const [name, setName] = useState(bill?.name ?? "");
  const [amount, setAmount] = useState(bill ? centsToInputValue(bill.amount_cents) : "");
  const [dueDay, setDueDay] = useState(bill ? String(bill.due_day) : "");
  const [categoryId, setCategoryId] = useState(bill?.category_id ?? "");
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingId = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amountCents = parseDollarsToCents(amount);
    if (amountCents === null) {
      setError("Enter an amount like 12.50.");
      return;
    }
    if (name.trim().length === 0) {
      setError("Enter a bill name.");
      return;
    }
    const day = Number(dueDay);
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setError("Pick a day from 1 to 31.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await upsertBill({
        id: bill?.id,
        name: name.trim(),
        amountCents,
        dueDay: day,
        categoryId: categoryId || null,
        active: bill?.active ?? true,
      });
      if (isEdit) {
        onSaved?.();
      } else {
        setName("");
        setAmount("");
        setDueDay("");
        setCategoryId("");
      }
    });
  }

  function handleDeactivate() {
    if (!bill) return;
    startTransition(async () => {
      await upsertBill({
        id: bill.id,
        name: bill.name,
        amountCents: bill.amount_cents,
        dueDay: bill.due_day,
        categoryId: bill.category_id,
        active: false,
      });
      onSaved?.();
    });
  }

  function handleDeleteClick() {
    if (!bill || !deleteBill) return;
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteBill(bill.id);
      onSaved?.();
    });
  }

  const categorySelect = (
    <select
      id={`${headingId}-category`}
      value={categoryId}
      onChange={(e) => setCategoryId(e.target.value)}
      disabled={pending}
      className={
        isEdit
          ? "rounded-md border border-ink/22 bg-page px-2 py-1.5 text-sm text-ink disabled:opacity-60"
          : "w-full rounded-lg border border-ink/22 bg-page px-3 py-2.5 text-ink disabled:opacity-60"
      }
    >
      <option value="">Uncategorized</option>
      {categories.map((category) => (
        <option key={category.id} value={category.id}>
          {category.name}
        </option>
      ))}
    </select>
  );

  if (isEdit) {
    return (
      <div className="relative z-10 my-1 rounded-lg border border-ink/20 bg-page p-3 shadow-[0_2px_8px_rgba(35,39,31,0.12)]">
        <form onSubmit={handleSubmit} noValidate className="flex flex-wrap items-end gap-3">
          <div className="flex min-w-[140px] flex-1 flex-col gap-1">
            <label htmlFor={`${headingId}-name`} className="text-[12px] font-semibold">
              Name
            </label>
            <input
              id={`${headingId}-name`}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              className="w-full rounded-md border border-ink/22 bg-page px-2 py-1.5 text-sm text-ink disabled:opacity-60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${headingId}-amount`} className="text-[12px] font-semibold">
              Amount
            </label>
            <input
              id={`${headingId}-amount`}
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
              className="w-24 rounded-md border border-ink/22 bg-page px-2 py-1.5 font-data text-sm text-ink disabled:opacity-60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${headingId}-due-day`} className="text-[12px] font-semibold">
              Due day
            </label>
            <input
              id={`${headingId}-due-day`}
              type="number"
              min={1}
              max={31}
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              disabled={pending}
              className="w-20 rounded-md border border-ink/22 bg-page px-2 py-1.5 font-data text-sm text-ink disabled:opacity-60"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${headingId}-category`} className="text-[12px] font-semibold">
              Category
            </label>
            {categorySelect}
          </div>
          <div className="ml-auto flex items-center gap-3 pb-0.5">
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={pending}
              className="min-h-[44px] rounded-md px-2 text-[13.5px] font-medium text-debit disabled:opacity-60"
            >
              Deactivate
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              disabled={pending}
              className="min-h-[44px] rounded-md px-2 text-[13.5px] font-medium text-debit disabled:opacity-60"
            >
              {confirmingDelete ? "Confirm delete?" : "Delete"}
            </button>
            <button
              type="submit"
              disabled={pending}
              className="pressable min-h-[44px] rounded-md bg-banker px-4 text-[13.5px] font-semibold text-page disabled:opacity-60"
            >
              Save
            </button>
          </div>
        </form>
        {error ? <p className="mt-2 text-[13px] text-debit">{error}</p> : null}
      </div>
    );
  }

  return (
    <section className="glass mt-4 p-5" aria-labelledby={headingId}>
      <p id={headingId} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/55">
        Add bill
      </p>
      <form onSubmit={handleSubmit} noValidate>
        <div className="mt-3.5">
          <label htmlFor={`${headingId}-name`} className="mb-1 block text-[12.5px] font-semibold">
            Name
          </label>
          <input
            id={`${headingId}-name`}
            placeholder="Rent"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={pending}
            className="w-full rounded-lg border border-ink/22 bg-page px-3 py-2.5 text-ink placeholder:text-ink/35 disabled:opacity-60"
          />
        </div>
        <div className="mt-3.5 flex gap-3">
          <div className="flex-1">
            <label htmlFor={`${headingId}-amount`} className="mb-1 block text-[12.5px] font-semibold">
              Amount
            </label>
            <input
              id={`${headingId}-amount`}
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={pending}
              className="w-full rounded-lg border border-ink/22 bg-page px-3 py-2.5 font-data text-base text-ink placeholder:text-ink/35 disabled:opacity-60"
            />
          </div>
          <div className="w-28">
            <label htmlFor={`${headingId}-due-day`} className="mb-1 block text-[12.5px] font-semibold">
              Due day
            </label>
            <input
              id={`${headingId}-due-day`}
              type="number"
              min={1}
              max={31}
              placeholder="1"
              value={dueDay}
              onChange={(e) => setDueDay(e.target.value)}
              disabled={pending}
              className="w-full rounded-lg border border-ink/22 bg-page px-3 py-2.5 font-data text-ink placeholder:text-ink/35 disabled:opacity-60"
            />
          </div>
        </div>
        <div className="mt-3.5">
          <label htmlFor={`${headingId}-category`} className="mb-1 block text-[12.5px] font-semibold">
            Category
          </label>
          {categorySelect}
        </div>
        {error ? <p className="mt-2 text-sm text-debit">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="pressable mt-4 min-h-[44px] w-full rounded-lg bg-banker px-4 text-[14.5px] font-semibold text-page shadow-[0_1px_2px_rgba(35,39,31,0.25)] hover:bg-[#244737] disabled:opacity-60"
        >
          {pending ? "Adding…" : "Add bill"}
        </button>
        <p className="mt-3 text-[12.5px] text-ink/50">
          Reminders go out 3 days and 1 day before each due date.
        </p>
      </form>
    </section>
  );
}
