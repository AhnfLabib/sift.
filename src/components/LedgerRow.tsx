"use client";

import { useId, useState, useTransition } from "react";

import { parseDollarsToCents } from "@/lib/domain/money";
import type { deleteTransaction, updateTransaction } from "@/lib/db/mutations";

const MONTH_ABBR = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** "2026-07-02" -> "Jul 2" */
function formatEntryDate(isoDate: string): string {
  const [, month, day] = isoDate.split("-").map(Number);
  return `${MONTH_ABBR[month - 1]} ${day}`;
}

/** 1400 -> "14.00"; 128450 -> "1,284.50" (no currency symbol — ledger convention). */
function formatAmount(cents: number): string {
  return (cents / 100).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/** 1400 -> "14.00" (editable input value, no grouping separators). */
function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

interface Props {
  id: string;
  date: string;
  merchant: string;
  amountCents: number;
  source: "web" | "chat" | "sms";
  categoryId: string | null;
  categoryName: string | null;
  categories: { id: string; name: string }[];
  inked: boolean;
  updateTransaction: typeof updateTransaction;
  deleteTransaction: typeof deleteTransaction;
}

/**
 * One ledger row. Click (or Enter/Space) opens an inline edit strip —
 * amount, merchant, category (incl. Uncategorized), an optional
 * "remember this merchant" checkbox, Save / Delete. Delete is a debit text
 * button that arms on first click and fires on a second confirming click.
 */
export default function LedgerRow({
  id,
  date,
  merchant,
  amountCents,
  source,
  categoryId,
  categoryName,
  categories,
  inked,
  updateTransaction,
  deleteTransaction,
}: Props) {
  const [editing, setEditing] = useState(false);
  const [amountInput, setAmountInput] = useState(() => centsToInputValue(amountCents));
  const [merchantInput, setMerchantInput] = useState(merchant);
  const [categoryInput, setCategoryInput] = useState(categoryId ?? "");
  const [remember, setRemember] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingId = useId();

  function openEdit() {
    setAmountInput(centsToInputValue(amountCents));
    setMerchantInput(merchant);
    setCategoryInput(categoryId ?? "");
    setRemember(false);
    setConfirmingDelete(false);
    setError(null);
    setEditing(true);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseDollarsToCents(amountInput);
    if (cents === null) {
      setError("Enter an amount like 12.50.");
      return;
    }
    if (merchantInput.trim().length === 0) {
      setError("Enter where you spent it.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await updateTransaction(id, {
        amountCents: cents,
        merchant: merchantInput.trim(),
        categoryId: categoryInput === "" ? null : categoryInput,
        rememberKeyword: categoryInput !== "" && remember,
      });
      setEditing(false);
    });
  }

  function handleDeleteClick() {
    if (!confirmingDelete) {
      setConfirmingDelete(true);
      return;
    }
    startTransition(async () => {
      await deleteTransaction(id);
    });
  }

  const catSuffix = source !== "web" ? ` · ${source}` : "";

  if (editing) {
    return (
      <div className="relative z-10 my-1 rounded-lg border border-ink/20 bg-page p-3 shadow-[0_2px_8px_rgba(35,39,31,0.12)]">
        <form onSubmit={handleSave} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label htmlFor={`${headingId}-amount`} className="text-[12px] font-semibold">
              Amount
            </label>
            <input
              id={`${headingId}-amount`}
              inputMode="decimal"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              className="w-24 rounded-md border border-ink/22 bg-page px-2 py-1.5 font-data text-sm text-ink"
            />
          </div>
          <div className="flex min-w-[120px] flex-1 flex-col gap-1">
            <label htmlFor={`${headingId}-merchant`} className="text-[12px] font-semibold">
              Merchant
            </label>
            <input
              id={`${headingId}-merchant`}
              value={merchantInput}
              onChange={(e) => setMerchantInput(e.target.value)}
              className="w-full rounded-md border border-ink/22 bg-page px-2 py-1.5 text-sm text-ink"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={`${headingId}-category`} className="text-[12px] font-semibold">
              Category
            </label>
            <select
              id={`${headingId}-category`}
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="rounded-md border border-ink/22 bg-page px-2 py-1.5 text-sm text-ink"
            >
              <option value="">Uncategorized</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
          {categoryInput !== "" ? (
            <label className="flex items-center gap-1.5 pb-1.5 text-[12.5px]">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="h-[18px] w-[18px]"
              />
              Remember this merchant
            </label>
          ) : null}
          <div className="ml-auto flex items-center gap-3 pb-0.5">
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
    <button
      type="button"
      onClick={openEdit}
      className={`entry w-full appearance-none border-0 bg-transparent p-0 text-left ${inked ? "inked" : ""}`}
    >
      <span className="date">{formatEntryDate(date)}</span>
      <span className="what">
        <span className="merchant">{merchant}</span>
        <span className={`cat ${categoryName ? "" : "uncat"}`}>
          {(categoryName ?? "Uncategorized") + catSuffix}
        </span>
      </span>
      <span className="amount">{formatAmount(amountCents)}</span>
    </button>
  );
}
