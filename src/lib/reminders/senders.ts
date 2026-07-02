import { formatCents } from "@/lib/domain/money";
import type { ReminderCandidate } from "./compute";

/** Shared plain-text body for both channels. */
function reminderText(c: ReminderCandidate): string {
  return `${c.billName} (${formatCents(c.amountCents)}) is due on ${c.dueDate}. — sift.`;
}

/** Email is only sendable when all three Resend env vars are present. */
export function isEmailConfigured(): boolean {
  return Boolean(
    process.env.RESEND_API_KEY &&
      process.env.REMINDER_FROM_EMAIL &&
      process.env.REMINDER_TO_EMAIL
  );
}

/**
 * WhatsApp is only sendable when all three Twilio env vars are present AND the
 * profile has a phone number to send to.
 */
export function isWhatsAppConfigured(phone: string | null | undefined): boolean {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_WHATSAPP_FROM &&
      phone
  );
}

/**
 * Sends a reminder via Resend's REST API. Silently skips when unconfigured
 * (not a failure). Throws with the response body on any non-2xx status.
 */
export async function sendReminderEmail(c: ReminderCandidate): Promise<void> {
  if (!isEmailConfigured()) return;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.REMINDER_FROM_EMAIL,
      to: process.env.REMINDER_TO_EMAIL,
      subject: `${c.billName} — ${formatCents(c.amountCents)} due ${c.dueDate}`,
      text: reminderText(c),
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend email failed (${res.status}): ${body}`);
  }
}

/**
 * Sends a reminder via Twilio's WhatsApp REST API. Silently skips when
 * unconfigured (not a failure). Throws with the response body on non-2xx.
 */
export async function sendReminderWhatsApp(
  c: ReminderCandidate,
  toPhone: string
): Promise<void> {
  if (!isWhatsAppConfigured(toPhone)) return;

  const sid = process.env.TWILIO_ACCOUNT_SID as string;
  const authToken = process.env.TWILIO_AUTH_TOKEN as string;
  const from = process.env.TWILIO_WHATSAPP_FROM as string;

  const form = new URLSearchParams({
    From: from,
    To: `whatsapp:${toPhone}`,
    Body: reminderText(c),
  });

  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${authToken}`).toString(
          "base64"
        )}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Twilio WhatsApp failed (${res.status}): ${text}`);
  }
}
