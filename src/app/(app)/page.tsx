import ChatPanel from "@/components/ChatPanel";
import Fab from "@/components/Fab";
import LedgerCard from "@/components/LedgerCard";
import MonthSummary from "@/components/MonthSummary";
import QuickAdd from "@/components/QuickAdd";
import { getDashboardData } from "@/lib/db/queries";
import {
  copyLastMonthBudgets,
  deleteTransaction,
  logExpenseChat,
  logExpenseWeb,
  updateTransaction,
} from "@/lib/db/mutations";

export default async function DashboardPage() {
  const {
    summary,
    transactions,
    categories,
    monthISO,
    hasBudgetsThisMonth,
    hasBudgetsLastMonth,
  } = await getDashboardData();

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  return (
    <main className="mx-auto grid max-w-[1240px] grid-cols-1 gap-4 px-4 pb-28 pt-7 md:grid-cols-2 md:gap-6 md:px-7 md:pb-16 lg:grid-cols-[4fr_5fr_3fr]">
      <MonthSummary
        summary={summary}
        monthISO={monthISO}
        hasBudgetsThisMonth={hasBudgetsThisMonth}
        hasBudgetsLastMonth={hasBudgetsLastMonth}
        copyLastMonthBudgets={copyLastMonthBudgets}
      />

      <LedgerCard
        transactions={transactions}
        categories={categoryOptions}
        monthISO={monthISO}
        totalSpentCents={summary.totalSpentCents}
        updateTransaction={updateTransaction}
        deleteTransaction={deleteTransaction}
      />

      <div className="hidden md:col-span-2 md:block lg:col-span-1">
        <QuickAdd categories={categoryOptions} logExpenseWeb={logExpenseWeb} />
        <ChatPanel logExpenseChat={logExpenseChat} />
      </div>

      <Fab
        categories={categoryOptions}
        logExpenseWeb={logExpenseWeb}
        logExpenseChat={logExpenseChat}
      />
    </main>
  );
}
