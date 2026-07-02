// Publicly reachable Twilio WhatsApp inbound-message webhook. `src/middleware.ts`
// exempts this path from the auth wall, so this route's *only* security is:
// (1) the Twilio request-signature check below, and (2) strict matching of
// the sender's phone number against the single profile's stored number.
// Never trust anything in the request beyond what those two checks allow.

import { NextResponse } from "next/server";
import { parseExpense, type KeywordEntry } from "@/lib/parser/parse";
import { formatCents } from "@/lib/domain/money";
import { todayInTz, monthStart } from "@/lib/domain/dates";
import { createAdminSupabase } from "@/lib/supabase/admin";
import { validateTwilioSignature } from "@/lib/twilio/signature";
import type { Profile } from "@/lib/db/types";

// Never cache: this route mutates state and must validate every request fresh.
export const dynamic = "force-dynamic";

const UNPARSEABLE_REPLY =
  'Couldn\'t read an amount in that message. Start with a number, like "12.50 coffee".';

function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * `<Response><Message>…</Message></Response>`, or a bare `<Response></Response>`
 * (no Message element) for a silent drop — `messageText === null` must be the
 * ONLY way to get the empty form, since that's what keeps unknown senders and
 * "no profile configured" indistinguishable from each other.
 */
function twimlResponse(messageText: string | null): NextResponse {
  const xml =
    messageText === null
      ? "<Response></Response>"
      : `<Response><Message>${escapeXml(messageText)}</Message></Response>`;
  return new NextResponse(xml, {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

/** Twilio posts application/x-www-form-urlencoded; flatten to name -> value. */
async function readParams(request: Request): Promise<Record<string, string>> {
  const formData = await request.formData();
  const params: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    // Twilio's webhook body is entirely text fields; formData() typing
    // allows File, but a urlencoded body never actually contains one.
    params[key] = typeof value === "string" ? value : value.name;
  }
  return params;
}

export async function POST(request: Request): Promise<Response> {
  const params = await readParams(request);
  const signature = request.headers.get("X-Twilio-Signature") ?? "";

  // Fail closed: a missing auth token must NEVER validate a signature, so an
  // unconfigured deployment rejects every request instead of accepting all.
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  if (!authToken) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // Proxies (e.g. Vercel's edge network) can rewrite host/proto on
  // `request.url`, which would desync it from the URL Twilio actually signed
  // against. In production, set WEBHOOK_PUBLIC_URL to the *exact* full URL
  // configured in the Twilio console; request.url is only a same-origin-dev
  // fallback, not something to rely on once traffic passes through a proxy.
  const publicUrl = process.env.WEBHOOK_PUBLIC_URL || request.url;

  if (!validateTwilioSignature(authToken, publicUrl, params, signature)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // "whatsapp:+15551234567" -> "+15551234567". Assumes profile.phone is
  // stored in E.164 form, matching what remains after stripping this prefix.
  const from = (params.From ?? "").replace(/^whatsapp:/, "");

  const supabase = createAdminSupabase();

  // Single-user app: the one profile is the first (and only) row.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .limit(1)
    .maybeSingle();
  const profile = profileRow as Profile | null;

  // No profile configured, or the sender doesn't exactly match the
  // configured phone: respond identically either way (silent drop) so an
  // unknown sender can learn nothing — not even that the app exists.
  if (!profile || !profile.phone || profile.phone !== from) {
    return twimlResponse(null);
  }

  const body = params.Body ?? "";

  const [keywordsRes, categoriesRes] = await Promise.all([
    supabase
      .from("merchant_keywords")
      .select("keyword, category_id")
      .eq("user_id", profile.id),
    supabase.from("categories").select("id, name").eq("user_id", profile.id),
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

  const parsed = parseExpense(body, keywords);
  if (!parsed) {
    return twimlResponse(UNPARSEABLE_REPLY);
  }

  const todayISO = todayInTz(profile.timezone);

  const { error: insertError } = await supabase.from("transactions").insert({
    user_id: profile.id,
    amount_cents: parsed.amountCents,
    merchant: parsed.merchant,
    category_id: parsed.categoryId,
    date: todayISO,
    source: "sms",
    raw_input: body,
  });
  if (insertError) throw insertError;

  if (!parsed.categoryId) {
    return twimlResponse(
      `Logged ${formatCents(parsed.amountCents)} — ${parsed.merchant}. No category yet — tag it in the app and sift. remembers next time.`,
    );
  }

  // Guaranteed to resolve: parsed.categoryId always comes from a matched
  // merchant_keywords row, whose category_id is FK-constrained to an
  // existing category.
  const categoryName = categoryNameById.get(parsed.categoryId)!;

  // Sum this category's transactions for the current month, including the
  // row just inserted above. No transaction in this app is ever dated in
  // the future, so bounding the range by [monthStart, today] (rather than
  // [monthStart, nextMonthStart)) already covers the entire month exactly.
  const { data: monthRows, error: monthError } = await supabase
    .from("transactions")
    .select("amount_cents")
    .eq("user_id", profile.id)
    .eq("category_id", parsed.categoryId)
    .gte("date", monthStart(todayISO))
    .lte("date", todayISO);
  if (monthError) throw monthError;

  const categoryTotalCents = (monthRows ?? []).reduce(
    (sum: number, row: { amount_cents: number }) => sum + row.amount_cents,
    0,
  );

  return twimlResponse(
    `Logged ${formatCents(parsed.amountCents)} — ${parsed.merchant} — ${categoryName}. ${categoryName} this month: ${formatCents(categoryTotalCents)}.`,
  );
}
