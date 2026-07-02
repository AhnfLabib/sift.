"use client";

import { useState, useTransition } from "react";

import { parseDollarsToCents } from "@/lib/domain/money";
import type { setBudget } from "@/lib/db/mutations";

/** 1400 -> "14.00" (editable input value, no grouping separators). */
function centsToInputValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

interface Props {
  categoryId: string;
  limitCents: number | null;
  setBudget: typeof setBudget;
}

/**
 * Mono budget input for one category: shows the current month's limit in
 * dollars, blank when unset. Commits on blur and on Enter/submit; an empty
 * or zero value clears the budget (`setBudget(id, 0)`).
 */
export default function BudgetEditor({ categoryId, limitCents, setBudget }: Props) {
  const [value, setValue] = useState(limitCents ? centsToInputValue(limitCents) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commit() {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      setError(null);
      startTransition(async () => {
        await setBudget(categoryId, 0);
      });
      return;
    }

    const cents = parseDollarsToCents(trimmed);
    if (cents === null) {
      setError("Enter an amount like 12.50.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await setBudget(categoryId, cents);
    });
  }

  return (
    <div className="mt-3.5">
      <label htmlFor={`budget-${categoryId}`} className="mb-1 block text-[12px] font-semibold text-ink/70">
        Monthly budget
      </label>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <input
          id={`budget-${categoryId}`}
          inputMode="decimal"
          placeholder="0.00"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onBlur={commit}
          disabled={pending}
          className="w-28 rounded-lg border border-ink/20 bg-page px-2.5 py-1.5 font-data text-sm text-ink placeholder:text-ink/35 disabled:opacity-60"
        />
      </form>
      {error ? <p className="mt-1 text-[12.5px] text-debit">{error}</p> : null}
    </div>
  );
}
