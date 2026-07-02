import "server-only";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Bill, Category, MerchantKeyword, Profile, Transaction } from "@/lib/db/types";
import { addDaysISO, monthStart, prevMonthStart, todayInTz } from "@/lib/domain/dates";
import { summarizeMonth, type MonthSummary } from "@/lib/domain/summary";

/**
 * First day of the month after `monthISO` (which must itself be a
 * first-of-month "YYYY-MM-01" string). Adding 31 days from the 1st always
 * lands somewhere in the immediately following month (no month has more
 * than 31 days), so truncating back to that month's 1st via `monthStart`
 * gives the exact next-month boundary without reimplementing day-in-month
 * math.
 */
function nextMonthStart(monthISO: string): string {
  return monthStart(addDaysISO(monthISO, 31));
}

/**
 * Dashboard data for the current month, scoped to the signed-in user via
 * RLS on the cookie-bound server client.
 */
export async function getDashboardData(): Promise<{
  profile: Profile;
  monthISO: string;
  summary: MonthSummary;
  transactions: (Transaction & { category: Pick<Category, "id" | "name"> | null })[];
  categories: Category[];
  hasBudgetsThisMonth: boolean;
  hasBudgetsLastMonth: boolean;
}> {
  const supabase = await createServerSupabase();

  // RLS ("own profile": id = auth.uid()) means this always resolves to the
  // single signed-in user's row, with no explicit filter needed.
  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .single();
  if (profileError || !profileRow) {
    throw profileError ?? new Error("Profile not found");
  }
  const profile = profileRow as Profile;

  const monthISO = monthStart(todayInTz(profile.timezone));
  const lastMonthISO = prevMonthStart(monthISO);
  const nextMonthISO = nextMonthStart(monthISO);

  const [categoriesRes, transactionsRes, budgetsRes, lastMonthBudgetsRes] = await Promise.all([
    supabase.from("categories").select("*").order("created_at", { ascending: true }),
    supabase
      .from("transactions")
      .select("*, category:categories(id,name)")
      .gte("date", monthISO)
      .lt("date", nextMonthISO)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false }),
    supabase.from("budgets").select("*").eq("month", monthISO),
    supabase.from("budgets").select("id", { count: "exact", head: true }).eq("month", lastMonthISO),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (transactionsRes.error) throw transactionsRes.error;
  if (budgetsRes.error) throw budgetsRes.error;
  if (lastMonthBudgetsRes.error) throw lastMonthBudgetsRes.error;

  const categories = (categoriesRes.data ?? []) as Category[];
  const transactions = (transactionsRes.data ?? []) as (Transaction & {
    category: Pick<Category, "id" | "name"> | null;
  })[];
  const budgets = budgetsRes.data ?? [];

  const summary = summarizeMonth(transactions, budgets, categories);

  return {
    profile,
    monthISO,
    summary,
    transactions,
    categories,
    hasBudgetsThisMonth: budgets.length > 0,
    hasBudgetsLastMonth: (lastMonthBudgetsRes.count ?? 0) > 0,
  };
}

/** All categories for the signed-in user, each with its merchant keywords. */
export async function getCategoriesWithKeywords(): Promise<
  (Category & { keywords: MerchantKeyword[] })[]
> {
  const supabase = await createServerSupabase();

  const [categoriesRes, keywordsRes] = await Promise.all([
    supabase.from("categories").select("*").order("created_at", { ascending: true }),
    supabase.from("merchant_keywords").select("*").order("keyword", { ascending: true }),
  ]);

  if (categoriesRes.error) throw categoriesRes.error;
  if (keywordsRes.error) throw keywordsRes.error;

  const categories = (categoriesRes.data ?? []) as Category[];
  const keywords = (keywordsRes.data ?? []) as MerchantKeyword[];

  const keywordsByCategory = new Map<string, MerchantKeyword[]>();
  for (const keyword of keywords) {
    const list = keywordsByCategory.get(keyword.category_id) ?? [];
    list.push(keyword);
    keywordsByCategory.set(keyword.category_id, list);
  }

  return categories.map((category) => ({
    ...category,
    keywords: keywordsByCategory.get(category.id) ?? [],
  }));
}

/** All bills for the signed-in user. */
export async function getBills(): Promise<Bill[]> {
  const supabase = await createServerSupabase();

  const { data, error } = await supabase
    .from("bills")
    .select("*")
    .order("due_day", { ascending: true });
  if (error) throw error;

  return (data ?? []) as Bill[];
}
