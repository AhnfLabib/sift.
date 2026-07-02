"use client";

import { useId, useState, useTransition } from "react";

import type { MerchantKeyword } from "@/lib/db/types";
import type { addCategory, addKeyword, deleteKeyword, setBudget } from "@/lib/db/mutations";
import BudgetEditor from "./BudgetEditor";

export interface CategoryWithKeywords {
  id: string;
  name: string;
  icon: string;
  keywords: MerchantKeyword[];
  limitCents: number | null;
}

interface CardProps {
  category: CategoryWithKeywords;
  addKeyword: typeof addKeyword;
  deleteKeyword: typeof deleteKeyword;
  setBudget: typeof setBudget;
}

/** One paper card: the record of a category's taxonomy. */
function CategoryCard({ category, addKeyword, deleteKeyword, setBudget }: CardProps) {
  const [keyword, setKeyword] = useState("");
  const [pending, startTransition] = useTransition();
  const headingId = useId();

  function handleAddKeyword(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = keyword.trim();
    if (trimmed.length === 0) return;
    startTransition(async () => {
      await addKeyword(trimmed, category.id);
      setKeyword("");
    });
  }

  function handleDeleteKeyword(id: string) {
    startTransition(async () => {
      await deleteKeyword(id);
    });
  }

  return (
    <section
      aria-labelledby={headingId}
      className="rounded-xl border border-ink/15 bg-page p-5 shadow-[0_2px_8px_rgba(35,39,31,0.10)]"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-2xl leading-none" aria-hidden="true">
          {category.icon}
        </span>
        <h2 id={headingId} className="text-[15.5px] font-semibold">
          {category.name}
        </h2>
      </div>

      <div className="mt-3.5 flex flex-wrap gap-2">
        {category.keywords.length === 0 ? (
          <p className="text-[13px] text-ink/55">
            No keywords yet — add one and chat entries file themselves.
          </p>
        ) : (
          category.keywords.map((kw) => (
            <span
              key={kw.id}
              className="inline-flex items-center gap-1.5 rounded-full bg-ink/6 px-2.5 py-1 font-data text-[12px] text-ink"
            >
              {kw.keyword}
              <button
                type="button"
                aria-label={`Remove keyword ${kw.keyword}`}
                onClick={() => handleDeleteKeyword(kw.id)}
                disabled={pending}
                className="-m-1 grid h-6 w-6 place-items-center rounded-full text-ink/50 hover:text-debit disabled:opacity-60"
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <form onSubmit={handleAddKeyword} className="mt-3.5 flex gap-2">
        <input
          aria-label="Add keyword"
          placeholder="trader joe's"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          disabled={pending}
          className="min-w-0 flex-1 rounded-lg border border-ink/20 bg-page px-2.5 py-1.5 font-data text-sm text-ink placeholder:text-ink/35 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={pending}
          className="pressable min-h-[44px] shrink-0 rounded-lg bg-banker px-3 text-[13px] font-semibold text-page disabled:opacity-60"
        >
          Add keyword
        </button>
      </form>

      <BudgetEditor categoryId={category.id} limitCents={category.limitCents} setBudget={setBudget} />
    </section>
  );
}

interface Props {
  categories: CategoryWithKeywords[];
  addCategory: typeof addCategory;
  addKeyword: typeof addKeyword;
  deleteKeyword: typeof deleteKeyword;
  setBudget: typeof setBudget;
}

/**
 * The categories & keywords page's client shell: a paper card per category
 * (the record — its taxonomy) plus a glass "Add category" panel (a tool)
 * at the end.
 */
export default function CategoryManager({
  categories,
  addCategory,
  addKeyword,
  deleteKeyword,
  setBudget,
}: Props) {
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const headingId = useId();

  function handleAddCategory(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim().length === 0) {
      setError("Enter a category name.");
      return;
    }
    if (icon.trim().length === 0) {
      setError("Enter an icon, like 🍔.");
      return;
    }
    setError(null);
    startTransition(async () => {
      await addCategory(name.trim(), icon.trim());
      setName("");
      setIcon("");
    });
  }

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            addKeyword={addKeyword}
            deleteKeyword={deleteKeyword}
            setBudget={setBudget}
          />
        ))}
      </div>

      <section className="glass mt-4" aria-labelledby={headingId}>
        <p
          id={headingId}
          className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/55"
        >
          Add category
        </p>
        <form onSubmit={handleAddCategory} className="mt-3.5 flex flex-wrap items-end gap-3">
          <div className="min-w-[160px] flex-1">
            <label htmlFor={`${headingId}-name`} className="mb-1 block text-[12.5px] font-semibold">
              Name
            </label>
            <input
              id={`${headingId}-name`}
              placeholder="Groceries"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={pending}
              className="w-full rounded-lg border border-ink/22 bg-page px-3 py-2.5 text-ink placeholder:text-ink/35 disabled:opacity-60"
            />
          </div>
          <div className="w-24">
            <label htmlFor={`${headingId}-icon`} className="mb-1 block text-[12.5px] font-semibold">
              Icon
            </label>
            <input
              id={`${headingId}-icon`}
              placeholder="🛒"
              value={icon}
              onChange={(e) => setIcon(e.target.value)}
              disabled={pending}
              className="w-full rounded-lg border border-ink/22 bg-page px-3 py-2.5 text-ink placeholder:text-ink/35 disabled:opacity-60"
            />
          </div>
          <button
            type="submit"
            disabled={pending}
            className="pressable min-h-[44px] rounded-lg bg-banker px-4 text-[14.5px] font-semibold text-page shadow-[0_1px_2px_rgba(35,39,31,0.25)] hover:bg-[#244737] disabled:opacity-60"
          >
            {pending ? "Adding…" : "Add category"}
          </button>
        </form>
        {error ? <p className="mt-2 text-sm text-debit">{error}</p> : null}
      </section>
    </>
  );
}
