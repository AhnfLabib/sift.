import CategoryManager from "@/components/CategoryManager";
import { getCategoriesWithKeywords, getDashboardData } from "@/lib/db/queries";
import { addCategory, addKeyword, deleteKeyword, setBudget } from "@/lib/db/mutations";

export default async function CategoriesPage() {
  const [categories, { summary }] = await Promise.all([
    getCategoriesWithKeywords(),
    getDashboardData(),
  ]);

  // getDashboardData's summary only carries a limit for categories with
  // spend or a budget row this month; everything else has none.
  const limitByCategoryId = new Map<string, number>();
  for (const category of summary.categories) {
    if (category.categoryId !== null && category.limitCents !== null) {
      limitByCategoryId.set(category.categoryId, category.limitCents);
    }
  }

  const categoriesWithBudgets = categories.map((category) => ({
    ...category,
    limitCents: limitByCategoryId.get(category.id) ?? null,
  }));

  return (
    <main className="mx-auto max-w-[1000px] px-4 pb-16 pt-7 md:px-7">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.01em]">Categories</h1>
      <p className="mb-6 mt-1 max-w-[640px] text-sm text-ink/55">
        Add the words you actually type — a merchant, a nickname — once. sift. remembers them
        for every chat entry after.
      </p>

      <CategoryManager
        categories={categoriesWithBudgets}
        addCategory={addCategory}
        addKeyword={addKeyword}
        deleteKeyword={deleteKeyword}
        setBudget={setBudget}
      />
    </main>
  );
}
