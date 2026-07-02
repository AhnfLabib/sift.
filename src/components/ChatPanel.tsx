"use client";

import { useId, useState, useTransition } from "react";

import type { logExpenseChat as LogExpenseChat } from "@/lib/db/mutations";

interface Message {
  id: string;
  from: "you" | "bot";
  text: string;
}

let messageSeq = 0;
function nextMessageId(): string {
  messageSeq += 1;
  return `m${messageSeq}`;
}

interface Props {
  logExpenseChat: typeof LogExpenseChat;
}

/** Glass instrument panel: the till-receipt chat logger. */
export default function ChatPanel({ logExpenseChat }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [, startTransition] = useTransition();
  const headingId = useId();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const raw = input.trim();
    if (raw.length === 0) return;

    const botId = nextMessageId();
    setMessages((prev) => [
      ...prev,
      { id: nextMessageId(), from: "you", text: raw },
      { id: botId, from: "bot", text: "…" },
    ]);
    setInput("");

    startTransition(async () => {
      const result = await logExpenseChat(raw);
      setMessages((prev) =>
        prev.map((message) => (message.id === botId ? { ...message, text: result.reply } : message)),
      );
    });
  }

  return (
    <section className="glass mt-6 p-5" aria-labelledby={headingId}>
      <p id={headingId} className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/55">
        Chat
      </p>
      {messages.length > 0 ? (
        <div className="mt-3 flex flex-col gap-2">
          {messages.map((message) => (
            <p
              key={message.id}
              className={
                message.from === "you"
                  ? "max-w-[92%] self-end rounded-[10px] bg-banker px-3 py-2 font-data text-[13px] text-page"
                  : `max-w-[92%] self-start rounded-[10px] border border-ink/8 bg-page px-3 py-2 text-[13.5px] ${
                      message.text.startsWith("Logged") ? "font-data" : ""
                    }`
              }
            >
              {message.text}
            </p>
          ))}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          aria-label="Log an expense by message"
          placeholder="$12.50 coffee"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-h-[44px] flex-1 rounded-lg border border-ink/22 bg-page px-3 py-2 font-data text-[13px] text-ink"
        />
        {/* Deliberately never disabled: a disabled default button blocks the
            input's Enter-to-submit, silently swallowing rapid consecutive
            entries. Each send gets its own "…" placeholder bubble instead. */}
        <button
          type="submit"
          className="pressable min-h-[44px] rounded-lg bg-banker px-4 text-[13.5px] font-semibold text-page"
        >
          Log
        </button>
      </form>
    </section>
  );
}
