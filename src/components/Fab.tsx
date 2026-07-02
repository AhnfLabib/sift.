"use client";

import { useEffect, useState } from "react";

import type { logExpenseChat, logExpenseWeb } from "@/lib/db/mutations";
import ChatPanel from "./ChatPanel";
import QuickAdd from "./QuickAdd";

interface Props {
  categories: { id: string; name: string }[];
  logExpenseWeb: typeof logExpenseWeb;
  logExpenseChat: typeof logExpenseChat;
}

const CLOSE_MS = 160;

/**
 * Mobile-only floating action button (glass green disc) opening a bottom
 * sheet with the same QuickAdd + ChatPanel instruments the desktop right
 * column shows inline. CSS + `useState` only — no sheet library. The sheet
 * animates both ways ("open" mounts it, "closing" plays the exit before
 * unmount), closes on Escape, and locks body scroll while up.
 */
export default function Fab({ categories, logExpenseWeb, logExpenseChat }: Props) {
  const [phase, setPhase] = useState<"closed" | "open" | "closing">("closed");
  const mounted = phase !== "closed";

  function close() {
    setPhase("closing");
  }

  useEffect(() => {
    if (phase !== "closing") return;
    const timer = setTimeout(() => setPhase("closed"), CLOSE_MS);
    return () => clearTimeout(timer);
  }, [phase]);

  useEffect(() => {
    if (!mounted) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [mounted]);

  const closing = phase === "closing";

  return (
    <>
      <button
        type="button"
        aria-label="Log expense"
        onClick={() => setPhase("open")}
        className="pressable fixed bottom-5 right-5 z-20 grid h-14 w-14 place-items-center rounded-full border border-page/28 bg-banker/80 text-[26px] leading-none text-page shadow-[inset_0_1px_0_rgba(251,246,233,0.30),0_4px_14px_rgba(35,39,31,0.35)] backdrop-blur-[10px] backdrop-saturate-150 md:hidden"
      >
        ＋
      </button>

      {mounted ? (
        <div className="fixed inset-0 z-30 md:hidden" role="dialog" aria-modal="true" aria-label="Log an expense">
          <button
            type="button"
            aria-label="Close"
            onClick={close}
            className={`absolute inset-0 h-full w-full bg-ink/30 ${
              closing ? "animate-[backdrop-out_160ms_ease-in_forwards]" : "animate-[backdrop-in_180ms_ease-out]"
            }`}
          />
          <div
            className={`glass !rounded-b-none !rounded-t-2xl absolute inset-x-0 bottom-0 max-h-[85vh] overflow-y-auto p-5 pb-8 ${
              closing ? "animate-[sheet-down_160ms_ease-in_forwards]" : "animate-[sheet-up_200ms_cubic-bezier(0.2,0.9,0.3,1)]"
            }`}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="font-display text-lg">Log an expense</span>
              <button
                type="button"
                aria-label="Close"
                onClick={close}
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
