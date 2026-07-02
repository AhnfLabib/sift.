import BillForm from "@/components/BillForm";
import BillList from "@/components/BillList";
import { getBills, getDashboardData } from "@/lib/db/queries";
import { deleteBill, upsertBill } from "@/lib/db/mutations";
import { todayInTz } from "@/lib/domain/dates";

export default async function BillsPage() {
  // getDashboardData already carries both the profile (for the timezone
  // that defines "today") and the category list, so it's the lighter fit
  // here — no need for a second call to getCategoriesWithKeywords just for
  // category names we don't otherwise use.
  const [bills, { profile, categories }] = await Promise.all([
    getBills(),
    getDashboardData(),
  ]);

  const todayISO = todayInTz(profile.timezone);
  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <main className="mx-auto max-w-[820px] px-4 pb-16 pt-7 md:px-7">
      <h1 className="font-display text-[28px] font-bold tracking-[-0.01em]">Bills</h1>
      <p className="mb-6 mt-1 max-w-[640px] text-sm text-ink/55">
        Monthly bills sift. watches so reminders go out before they&rsquo;re due.
      </p>

      <BillList
        bills={bills}
        categories={categoryOptions}
        todayISO={todayISO}
        upsertBill={upsertBill}
        deleteBill={deleteBill}
      />

      <BillForm mode="create" categories={categoryOptions} upsertBill={upsertBill} />
    </main>
  );
}
