"use client";

import { useState } from "react";

type ExportState =
  | { status: "idle" }
  | { status: "pending" }
  | { status: "success"; rows: number; url: string }
  | { status: "error"; message: string };

/**
 * Triggers `POST /api/export/sheets` and reports the outcome inline:
 * a success line linking to the sheet, or the error in debit red.
 */
export default function ExportButton() {
  const [state, setState] = useState<ExportState>({ status: "idle" });
  const pending = state.status === "pending";

  async function handleExport() {
    setState({ status: "pending" });
    try {
      const res = await fetch("/api/export/sheets", { method: "POST" });
      const body = (await res.json()) as {
        rows?: number;
        url?: string;
        error?: string;
      };
      if (!res.ok || typeof body.rows !== "number" || !body.url) {
        setState({
          status: "error",
          message: body.error ?? "Export failed. Try again.",
        });
        return;
      }
      setState({ status: "success", rows: body.rows, url: body.url });
    } catch {
      setState({
        status: "error",
        message: "Couldn't reach the server. Check your connection and try again.",
      });
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleExport}
        disabled={pending}
        className="pressable min-h-[44px] w-full rounded-lg bg-banker px-4 text-[14.5px] font-semibold text-page shadow-[0_1px_2px_rgba(35,39,31,0.25)] hover:bg-[#244737] disabled:opacity-60 sm:w-auto sm:px-6"
      >
        {pending ? "Exporting…" : "Export to Sheets"}
      </button>
      {state.status === "success" ? (
        <p className="mt-3 text-sm text-ink">
          Exported <span className="font-data">{state.rows}</span> rows —{" "}
          <a
            href={state.url}
            target="_blank"
            rel="noreferrer"
            className="font-medium text-banker underline underline-offset-2"
          >
            open your sheet
          </a>
        </p>
      ) : null}
      {state.status === "error" ? (
        <p className="mt-3 text-sm text-debit">{state.message}</p>
      ) : null}
    </div>
  );
}
