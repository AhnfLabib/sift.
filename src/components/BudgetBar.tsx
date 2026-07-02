import { formatCents } from "@/lib/domain/money";

/**
 * One category row on the month-summary panel: name, spent/limit figures,
 * flat progress bar (`banker` fill, `debit` fill once over the limit).
 * Categories with spend but no budget set this month render figures only
 * (no bar — there is no limit to measure against).
 */
export default function BudgetBar({
  name,
  spentCents,
  limitCents,
}: {
  name: string;
  spentCents: number;
  limitCents: number | null;
}) {
  if (limitCents === null) {
    return (
      <div className="mb-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm font-medium">{name}</span>
          <span className="font-data text-[12.5px] text-ink/55">{formatCents(spentCents)}</span>
        </div>
      </div>
    );
  }

  const over = spentCents > limitCents;
  const pct = limitCents > 0 ? Math.min(100, (spentCents / limitCents) * 100) : 100;

  return (
    <div className="mb-4">
      <div className="mb-1.5 flex items-baseline justify-between">
        <span className="text-sm font-medium">{name}</span>
        <span className="font-data text-[12.5px] text-ink/55">
          <span className={over ? "font-medium text-debit" : "font-medium text-ink"}>
            {formatCents(spentCents)}
          </span>{" "}
          / {formatCents(limitCents)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-ink/8">
        <div
          className={`h-full rounded-full transition-[width] duration-300 ease-out ${over ? "bg-debit" : "bg-banker"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
