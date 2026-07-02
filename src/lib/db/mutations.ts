"use server";

import "server-only";
import { revalidatePath } from "next/cache";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Profile } from "@/lib/db/types";
import { monthStart, prevMonthStart, todayInTz } from "@/lib/domain/dates";
import { formatCents } from "@/lib/domain/money";
import { parseExpense, type KeywordEntry } from "@/lib/parser/parse";

type ServerSupabase = Awaited<ReturnType<typeof createServerSupabase>>;

/** Loads the authed user for the cookie-bound client, throwing if missing. */
async function requireUser(supabase: ServerSupabase) {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error("Not authenticated");
  }
  return data.user;
}

/** Loads the signed-in user's profile row (scoped by RLS). */
async function requireProfile(supabase: ServerSupabase): Promise<Profile> {
  const { data, error } = await supabase.from("profiles").select("*").single();
  if (error || !data) {
    throw error ?? new Error("Profile not found");
  }
  return data as Profile;
}

export async function logExpenseWeb(input: {
  amountCents: number;
  merchant: string;
  categoryId: string | null;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createServerSupabase();
  const user = await requireUser(supabase);
  const profile = await requireProfile(supabase);

  const { error } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount_cents: input.amountCents,
    merchant: input.merchant,
    category_id: input.categoryId,
    date: todayInTz(profile.timezone),
    source: "web",
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/");
  return { ok: true };
}

export async function logExpenseChat(raw: string): Promise<{ ok: boolean; reply: string }> {
  const supabase = await createServerSupabase();
  const user = await requireUser(supabase);
  const profile = await requireProfile(supabase);

  const [keywordsRes, categoriesRes] = await Promise.all([
    supabase.from("merchant_keywords").select("keyword, category_id"),
    supabase.from("categories").select("id, name"),
  ]);
  if (keywordsRes.error) throw keywordsRes.error;
  if (categoriesRes.error) throw categoriesRes.error;

  const keywords: KeywordEntry[] = (keywordsRes.data ?? []).map(
    (row: { keyword: string; category_id: string }) => ({
      keyword: row.keyword,
      categoryId: row.category_id,
    }),
  );
  const categoryNameById = new Map<string, string>(
    (categoriesRes.data ?? []).map((row: { id: string; name: string }) => [row.id, row.name]),
  );

  const parsed = parseExpense(raw, keywords);
  if (!parsed) {
    return {
      ok: false,
      reply: 'Couldn\'t read an amount in that message. Start with a number, like "12.50 coffee".',
    };
  }

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: user.id,
    amount_cents: parsed.amountCents,
    merchant: parsed.merchant,
    category_id: parsed.categoryId,
    date: todayInTz(profile.timezone),
    source: "chat",
    raw_input: raw,
  });
  if (insertError) throw insertError;

  revalidatePath("/");

  if (parsed.categoryId) {
    // Guaranteed to resolve: parsed.categoryId always comes from a matched
    // merchant_keywords row, whose category_id is FK-constrained to an
    // existing category.
    const categoryName = categoryNameById.get(parsed.categoryId)!;
    return {
      ok: true,
      reply: `Logged ${formatCents(parsed.amountCents)} — ${parsed.merchant} — ${categoryName}.`,
    };
  }

  return {
    ok: true,
    reply: `Logged ${formatCents(parsed.amountCents)} — ${parsed.merchant}. No category yet — tag it on the ledger and sift. remembers next time.`,
  };
}

export async function updateTransaction(
  id: string,
  patch: {
    amountCents?: number;
    merchant?: string;
    categoryId?: string | null;
    rememberKeyword?: boolean;
  },
): Promise<void> {
  const supabase = await createServerSupabase();
  const user = await requireUser(supabase);

  const updates: Record<string, unknown> = {};
  if (patch.amountCents !== undefined) updates.amount_cents = patch.amountCents;
  if (patch.merchant !== undefined) updates.merchant = patch.merchant;
  if (patch.categoryId !== undefined) updates.category_id = patch.categoryId;

  if (Object.keys(updates).length > 0) {
    const { error } = await supabase.from("transactions").update(updates).eq("id", id);
    if (error) throw error;
  }

  if (patch.rememberKeyword && patch.categoryId != null) {
    let merchant = patch.merchant;
    if (merchant === undefined) {
      const { data, error } = await supabase
        .from("transactions")
        .select("merchant")
        .eq("id", id)
        .single();
      if (error || !data) throw error ?? new Error("Transaction not found");
      merchant = data.merchant as string;
    }

    const { error: keywordError } = await supabase.from("merchant_keywords").upsert(
      { user_id: user.id, keyword: merchant.toLowerCase(), category_id: patch.categoryId },
      { onConflict: "user_id,keyword" },
    );
    if (keywordError) throw keywordError;
  }

  revalidatePath("/");
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = await createServerSupabase();
  await requireUser(supabase);

  const { error } = await supabase.from("transactions").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/");
}

export async function setBudget(categoryId: string, limitCents: number): Promise<void> {
  const supabase = await createServerSupabase();
  const user = await requireUser(supabase);
  const profile = await requireProfile(supabase);
  const monthISO = monthStart(todayInTz(profile.timezone));

  if (limitCents <= 0) {
    const { error } = await supabase
      .from("budgets")
      .delete()
      .eq("user_id", user.id)
      .eq("category_id", categoryId)
      .eq("month", monthISO);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("budgets").upsert(
      { user_id: user.id, category_id: categoryId, limit_cents: limitCents, month: monthISO },
      { onConflict: "user_id,category_id,month" },
    );
    if (error) throw error;
  }

  revalidatePath("/");
}

export async function copyLastMonthBudgets(): Promise<void> {
  const supabase = await createServerSupabase();
  const user = await requireUser(supabase);
  const profile = await requireProfile(supabase);
  const monthISO = monthStart(todayInTz(profile.timezone));
  const lastMonthISO = prevMonthStart(monthISO);

  const { data: lastMonthBudgets, error: fetchError } = await supabase
    .from("budgets")
    .select("category_id, limit_cents")
    .eq("month", lastMonthISO);
  if (fetchError) throw fetchError;

  if (lastMonthBudgets && lastMonthBudgets.length > 0) {
    const rows = lastMonthBudgets.map((budget: { category_id: string; limit_cents: number }) => ({
      user_id: user.id,
      category_id: budget.category_id,
      limit_cents: budget.limit_cents,
      month: monthISO,
    }));

    const { error: upsertError } = await supabase
      .from("budgets")
      .upsert(rows, { onConflict: "user_id,category_id,month" });
    if (upsertError) throw upsertError;
  }

  revalidatePath("/");
}

export async function addKeyword(keyword: string, categoryId: string): Promise<void> {
  const supabase = await createServerSupabase();
  const user = await requireUser(supabase);

  const { error } = await supabase.from("merchant_keywords").upsert(
    { user_id: user.id, keyword: keyword.toLowerCase(), category_id: categoryId },
    { onConflict: "user_id,keyword" },
  );
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/categories");
}

export async function deleteKeyword(id: string): Promise<void> {
  const supabase = await createServerSupabase();
  await requireUser(supabase);

  const { error } = await supabase.from("merchant_keywords").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/categories");
}

export async function addCategory(name: string, icon: string): Promise<void> {
  const supabase = await createServerSupabase();
  const user = await requireUser(supabase);

  const { error } = await supabase
    .from("categories")
    .insert({ user_id: user.id, name, icon });
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/categories");
}

export async function upsertBill(input: {
  id?: string;
  name: string;
  amountCents: number;
  dueDay: number;
  categoryId: string | null;
  active: boolean;
}): Promise<void> {
  const supabase = await createServerSupabase();
  const user = await requireUser(supabase);

  const row = {
    user_id: user.id,
    name: input.name,
    amount_cents: input.amountCents,
    due_day: input.dueDay,
    category_id: input.categoryId,
    active: input.active,
  };

  if (input.id) {
    const { error } = await supabase.from("bills").update(row).eq("id", input.id);
    if (error) throw error;
  } else {
    const { error } = await supabase.from("bills").insert(row);
    if (error) throw error;
  }

  revalidatePath("/");
  revalidatePath("/bills");
}

export async function deleteBill(id: string): Promise<void> {
  const supabase = await createServerSupabase();
  await requireUser(supabase);

  const { error } = await supabase.from("bills").delete().eq("id", id);
  if (error) throw error;

  revalidatePath("/");
  revalidatePath("/bills");
}
