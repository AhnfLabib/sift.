import type { SupabaseClient } from "@supabase/supabase-js";

export const PRESET_CATEGORIES = [
  { name: "Rent", icon: "🏠" }, { name: "Food", icon: "🍽️" },
  { name: "Transit", icon: "🚌" }, { name: "Utilities", icon: "💡" },
  { name: "Subscriptions", icon: "🔁" }, { name: "Entertainment", icon: "🎬" },
  { name: "Health", icon: "🩺" }, { name: "Shopping", icon: "🛍️" },
  { name: "Other", icon: "📎" },
] as const;

/**
 * Idempotent post-login setup: makes sure the single user's profile row
 * exists, and seeds the preset categories on their very first sign-in
 * (only if they have none yet).
 */
export async function ensureProfileSeeded(
  supabase: SupabaseClient,
  userId: string,
  email: string
): Promise<void> {
  void email; // not stored on profiles (see migration); kept for interface parity / future use

  const { error: upsertError } = await supabase
    .from("profiles")
    .upsert({ id: userId }, { onConflict: "id" });
  if (upsertError) throw upsertError;

  const { count, error: countError } = await supabase
    .from("categories")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId);
  if (countError) throw countError;

  if (!count) {
    const rows = PRESET_CATEGORIES.map((preset) => ({
      user_id: userId,
      name: preset.name,
      icon: preset.icon,
      is_preset: true,
    }));
    const { error: insertError } = await supabase.from("categories").insert(rows);
    if (insertError) throw insertError;
  }
}
