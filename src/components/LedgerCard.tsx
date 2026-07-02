import { formatCents } from "@/lib/domain/money";
import type { Category, Transaction } from "@/lib/db/types";
import type { deleteTransaction, updateTransaction } from "@/lib/db/mutations";
import LedgerRow from "./LedgerRow";

const MONTH_ABBR = [
  "JAN", "FEB", "MAR", "APR", "MAY", "JUN",
  "JUL", "AUG", "SEP", "OCT", "NOV", "DEC",
];

/** "2026-07-01" -> "JUL 2026 · p.1" */
function formatFolio(monthISO: string): string {
  const [year, month] = monthISO.split("-").map(Number);
  return `${MONTH_ABBR[month - 1]} ${year} · p.1`;
}

// A row is treated as freshly logged (and gets the ink-on animation) only
// if it was created moments ago — this keeps the animation reserved for
// entries added during the current visit, rather than replaying on every
// page load for whatever happens to sort first.
const RECENT_MS = 5000;

function isFreshlyLogged(createdAt: string): boolean {
  return Date.now() - new Date(createdAt).getTime() < RECENT_MS;
}

interface Props {
  transactions: (Transaction & { category: Pick<Category, "id" | "name"> | null })[];
  categories: { id: string; name: string }[];
  monthISO: string;
  totalSpentCents: number;
  updateTransaction: typeof updateTransaction;
  deleteTransaction: typeof deleteTransaction;
}

/**
 * The ledger card — paper, never glass. A genuinely ruled page: feint
 * hairlines and the red margin rule repeat independent of content, entries
 * sit inside them, and a hint row always shows where the next entry goes.
 */
export default function LedgerCard({
  transactions,
  categories,
  monthISO,
  totalSpentCents,
  updateTransaction,
  deleteTransaction,
}: Props) {
  return (
    <section id="ledger-h" className="ledger" aria-labelledby="ledger-title">
      <div className="ledger-head">
        <h2 id="ledger-title">Ledger</h2>
        <span className="folio">{formatFolio(monthISO)}</span>
      </div>
      <div className="ledger-cols" aria-hidden="true">
        <span>DATE</span>
        <span style={{ paddingLeft: 14 }}>ENTRY</span>
        <span className="amt">AMOUNT</span>
      </div>
      <div className="ledger-body">
        {transactions.map((tx) => (
          <LedgerRow
            key={tx.id}
            id={tx.id}
            date={tx.date}
            merchant={tx.merchant}
            amountCents={tx.amount_cents}
            source={tx.source}
            categoryId={tx.category_id}
            categoryName={tx.category?.name ?? null}
            categories={categories}
            inked={isFreshlyLogged(tx.created_at)}
            updateTransaction={updateTransaction}
            deleteTransaction={deleteTransaction}
          />
        ))}
        <div className="entry-hint">
          <span />
          <span>
            Next entry goes here — try <code>$14 chipotle</code>
          </span>
        </div>
      </div>
      <div className="ledger-foot">
        <span className="label">Month to date</span>
        <span className="sum">{formatCents(totalSpentCents)}</span>
      </div>
    </section>
  );
}
