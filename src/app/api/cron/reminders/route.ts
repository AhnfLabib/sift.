import { NextResponse } from "next/server";
import { todayInTz } from "@/lib/domain/dates";
import { createAdminSupabase } from "@/lib/supabase/admin";
import type { Bill, Profile } from "@/lib/db/types";
import {
  computeReminders,
  type ReminderCandidate,
} from "@/lib/reminders/compute";
import {
  isEmailConfigured,
  isWhatsAppConfigured,
  sendReminderEmail,
  sendReminderWhatsApp,
} from "@/lib/reminders/senders";

// Never cache: this route mutates state and must run fresh on every cron tick.
export const dynamic = "force-dynamic";

type Channel = {
  channel: "email" | "whatsapp";
  send: (c: ReminderCandidate) => Promise<void>;
};

/** Keep failure detail on the row but bounded — status is human diagnostics. */
function failedStatus(err: unknown): string {
  const message = err instanceof Error ? err.message : String(err);
  return `failed:${message.slice(0, 300)}`;
}

export async function GET(request: Request): Promise<Response> {
  // Load-bearing auth: a missing/blank CRON_SECRET must NEVER authorize.
  const secret = process.env.CRON_SECRET;
  const authHeader = request.headers.get("authorization");
  if (!secret || authHeader !== `Bearer ${secret}`) {
    // Opaque body — do not leak whether the secret is set or why this failed.
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const supabase = createAdminSupabase();

  // Single-user app: the one profile is the first (and only) row.
  const { data: profileRow } = await supabase
    .from("profiles")
    .select("*")
    .limit(1)
    .maybeSingle();
  const profile = profileRow as Profile | null;

  if (!profile) {
    return NextResponse.json({ sent: 0, skipped: 0, failed: 0 });
  }

  const todayISO = todayInTz(profile.timezone);

  const { data: billRows } = await supabase
    .from("bills")
    .select("*")
    .eq("active", true);
  const bills = (billRows ?? []) as Bill[];

  const candidates = computeReminders(bills, todayISO);

  // Only build log rows / attempt sends for channels that are fully configured.
  // Unconfigured channels are neither sent, skipped, nor failed — just absent.
  const channels: Channel[] = [];
  if (isEmailConfigured()) {
    channels.push({ channel: "email", send: sendReminderEmail });
  }
  if (isWhatsAppConfigured(profile.phone)) {
    const phone = profile.phone as string;
    channels.push({
      channel: "whatsapp",
      send: (c) => sendReminderWhatsApp(c, phone),
    });
  }

  let sent = 0;
  let skipped = 0;
  let failed = 0;

  for (const candidate of candidates) {
    for (const { channel, send } of channels) {
      // Per (candidate, channel) isolation: one failure never blocks the next.
      try {
        // Insert-first: the unique index is the dedupe gate. A successful
        // insert is our exclusive claim to send this exact reminder once.
        const { data: inserted, error: insertError } = await supabase
          .from("reminders_log")
          .insert({
            bill_id: candidate.billId,
            due_date: candidate.dueDate,
            lead_days: candidate.leadDays,
            channel,
            status: "pending",
          })
          .select("id")
          .single();

        if (insertError) {
          // 23505 = unique violation = already handled by a prior run/retry.
          // Any OTHER insert error is a real failure, not a duplicate.
          if (insertError.code === "23505") {
            skipped += 1;
            continue;
          }
          throw insertError;
        }

        const rowId = (inserted as { id: string }).id;

        // Only send AFTER a confirmed insert, so a send can never occur
        // without its log row already committed.
        try {
          await send(candidate);
          await supabase
            .from("reminders_log")
            .update({ status: "sent" })
            .eq("id", rowId);
          sent += 1;
        } catch (sendErr) {
          await supabase
            .from("reminders_log")
            .update({ status: failedStatus(sendErr) })
            .eq("id", rowId);
          failed += 1;
        }
      } catch {
        // Insert failure (non-duplicate) or any unexpected error for this
        // single (candidate, channel). Count it and move on.
        failed += 1;
      }
    }
  }

  return NextResponse.json({ sent, skipped, failed });
}
