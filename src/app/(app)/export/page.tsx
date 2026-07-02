import ExportButton from "@/components/ExportButton";

export default function ExportPage() {
  return (
    <main className="mx-auto max-w-[720px] px-4 pb-16 pt-7 md:px-7">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.01em]">Export</h1>
      <p className="mb-6 mt-1 max-w-[640px] text-sm text-ink/55">
        A one-way snapshot of the ledger, sent to Google Sheets on demand.
      </p>

      <section className="rounded-xl border border-ink/15 bg-page p-5 shadow-[0_2px_8px_rgba(35,39,31,0.10)]">
        <h2 className="font-display text-lg font-bold">Google Sheets</h2>
        <p className="mt-2 max-w-[560px] text-[14.5px] leading-relaxed text-ink/80">
          Sends a snapshot of every transaction and a monthly summary to your Google
          Sheet. The sheet is never read back — sift.&rsquo;s database stays the source
          of truth.
        </p>
      </section>

      <section className="glass mt-4 p-5">
        <ExportButton />
        <p className="mt-4 text-[12.5px] text-ink/50">
          Share the spreadsheet with your service account&rsquo;s email (Editor) before
          the first export.
        </p>
      </section>
    </main>
  );
}
