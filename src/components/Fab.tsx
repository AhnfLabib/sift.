"use client";

import { useState } from "react";

import type { logExpenseChat, logExpenseWeb } from "@/lib/db/mutations";
import ChatPanel from "./ChatPanel";
import QuickAdd from "./QuickAdd";

interface Props {
  categories: { id: string; name: string }[];
  logExpenseWeb: typeof logExpenseWeb;
  logExpenseChat: typeof logExpenseChat;
}

/**
 * Mobile-only floating action button (glass green disc) opening a bottom
 * sheet with the same QuickAdd + ChatPanel instruments the desktop right
 * column shows inline. CSS + `useState` only — no sheet library.
 */
export default function Fab({ categories, logExpenseWeb, logExpenseChat }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="Log expense"
        onClick={() => setOpen(true)}
        className="pressable fixed bottom-5 right-5 z-20 grid h-14 w-14 place-items-center rounded-full border border-page/28 bg-banker/80 text-[26px] leading-none text-page shadow-[inset_0_1px_0_rgba(251,246,233,0.30),0_4px_14px_rgba(35,39,31,0.35)] backdrop-blur-[10px] backdrop-saturate-150 md:hidden"
      >
        ＋
      </button>

      {open ? (
        <div className="fixed inset-0 z-30 md:hidden">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 h-full w-full bg-ink/30"
          />
          <div className="glass !rounded-b-none !rounded-t-2xl absolute inset-x-0 bottom-0 max-h-[85vh] animate-[sheet-up_180ms_ease-out] overflow-y-auto p-5 pb-8">
            <div className="mb-1 flex items-center justify-between">
              <span className="font-display text-lg">Log an expense</span>
              <button
                type="button"
                aria-label="Close"
                onClick={() => setOpen(false)}
                className="grid h-11 w-11 place-items-center rounded-full text-xl text-ink/55 hover:text-ink"
              >
                ✕
              </button>
            </div>
            <QuickAdd categories={categories} logExpenseWeb={logExpenseWeb} />
            <ChatPanel logExpenseChat={logExpenseChat} />
          </div>
        </div>
      ) : null}
    </>
  );
}
