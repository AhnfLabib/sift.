"use server";

import { redirect } from "next/navigation";
import { createServerSupabase } from "@/lib/supabase/server";
import { ensureProfileSeeded } from "@/lib/db/presets";

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  const supabase = await createServerSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect("/login?error=invalid-credentials");
  }

  const allowedEmail = process.env.ALLOWED_EMAIL;
  if (
    !data.user.email ||
    !allowedEmail ||
    data.user.email.toLowerCase() !== allowedEmail.toLowerCase()
  ) {
    await supabase.auth.signOut();
    redirect("/login?error=invalid-credentials");
  }

  await ensureProfileSeeded(supabase, data.user.id, data.user.email ?? email);

  redirect("/");
}
