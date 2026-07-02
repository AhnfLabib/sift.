"use client";

import { useId, useState, useTransition } from "react";

import { parseDollarsToCents } from "@/lib/domain/money";
import type { logExpenseWeb } from "@/lib/db/mutations";

interface Props {
  categories: { id: string; name: string }[];
  logExpenseWeb: typeof logExpenseWeb;
}

/** Glass instrument panel: the form version of logging an expense. */
export default function QuickAdd({ categories, logExpenseWeb }: Props) {
  const [amount, setAmount] = useState("");
  const [merchant, setMerchant] = useState("");
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingId = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cents = parseDollarsToCents(amount);
    if (cents === null) {
      setError("Enter an amount like 12.50.");
      return;
    }
    if (merchant.trim().length === 0) {
      setError("Enter where you spent it.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await logExpenseWeb({
        amountCents: cents,
        merchant: merchant.trim(),
        categoryId: categoryId || null,
      });
      if (result.ok) {
        setAmount("");
        setMerchant("");
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <section className="glass p-5" aria-labelledby={headingId}>
      <p id={headingId} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/55">
        Quick add
      </p>
      <form onSubmit={handleSubmit}>
        <div className="mt-3.5">
          <label htmlFor={`${headingId}-amount`} className="mb-1 block text-[12.5px] font-semibold">
            Amount
          </label>
          <input
            id={`${headingId}-amount`}
            inputMode="decimal"
            placeholder="0.00"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-ink/22 bg-page px-3 py-2.5 font-data text-base text-ink placeholder:text-ink/35"
          />
        </div>
        <div className="mt-3.5">
          <label htmlFor={`${headingId}-merchant`} className="mb-1 block text-[12.5px] font-semibold">
            Merchant
          </label>
          <input
            id={`${headingId}-merchant`}
            placeholder="Where was it?"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full rounded-lg border border-ink/22 bg-page px-3 py-2.5 text-ink placeholder:text-ink/35"
          />
        </div>
        <div className="mt-3.5">
          <label htmlFor={`${headingId}-category`} className="mb-1 block text-[12.5px] font-semibold">
            Category
          </label>
          <select
            id={`${headingId}-category`}
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-lg border border-ink/22 bg-page px-3 py-2.5 text-ink"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
        {error ? <p className="mt-2 text-sm text-debit">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="pressable mt-4 min-h-[44px] w-full rounded-lg bg-banker px-4 text-[14.5px] font-semibold text-page shadow-[0_1px_2px_rgba(35,39,31,0.25)] hover:bg-[#244737] disabled:opacity-60"
        >
          {pending ? "Logging…" : "Log expense"}
        </button>
      </form>
    </section>
  );
}
