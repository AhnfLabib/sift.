"use client";

import { useTransition } from "react";

import type { copyLastMonthBudgets } from "@/lib/db/mutations";

/**
 * Shown only when the current month has no budgets yet but last month did.
 * A tiny client island so the button can show a pending state via
 * `useTransition` while `copyLastMonthBudgets` (a server action) runs.
 */
export default function CopyBudgetsButton({
  action,
}: {
  action: typeof copyLastMonthBudgets;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(async () => { await action(); })}
      className="pressable mt-2 w-full rounded-lg bg-banker px-4 py-2.5 text-[14.5px] font-semibold text-page shadow-[0_1px_2px_rgba(35,39,31,0.25)] hover:bg-[#244737] disabled:opacity-60"
    >
      {pending ? "Copying…" : "Copy last month's budgets"}
    </button>
  );
}
