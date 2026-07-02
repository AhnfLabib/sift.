# sift.

A well-kept ledger for your money. sift. is a single-user personal finance PWA: log expenses in seconds from a web form, an in-app chat, or WhatsApp, and watch them land on a ruled ledger page with per-category budgets, monthly bill reminders, and an on-demand export to Google Sheets. It runs on Next.js and Supabase, deploys to Vercel, and is built for exactly one person — you.

## Local development

```bash
npm i
cp .env.example .env.local   # fill in real values
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Every variable in `.env.example` is commented with its purpose; the Supabase values are the only ones you need for the app to boot and sign in — the rest gate individual features (reminders, WhatsApp, Sheets export) and are skipped gracefully when absent.

## Supabase setup

1. Create a project at [supabase.com](https://supabase.com).
2. In the SQL editor, run the contents of `supabase/migrations/0001_init.sql`. It creates every table with row level security enabled.
3. In **Authentication → Users**, create your one user (email + password).
4. In **Authentication → Sign In / Up**, disable **"Allow new users to sign up"** — sift. is single-user, and nobody else should be able to register.
5. Sign in once so your profile row is seeded, then set `phone` (E.164, e.g. `+15551234567`) and `timezone` (e.g. `America/New_York`) on your row in the `profiles` table. The phone number is what lets WhatsApp messages reach your ledger; the timezone decides which calendar day an expense lands on.

## Security model

- **Auth wall:** middleware redirects every unauthenticated request to `/login`. Signing up is disabled in Supabase, and even an authenticated user is signed out unless their email matches `ALLOWED_EMAIL` — belt and suspenders.
- **Row level security:** every table carries a `user_id = auth.uid()` policy (profiles by `id`; the reminders log via its owning bill), so the anon key can only ever read your own rows.
- **Server-only secrets:** the service-role key is used exclusively by the Twilio webhook and the reminder cron, never in client or page code. The only `NEXT_PUBLIC_` values are the Supabase URL and anon key.
- **The exported Google Sheet is outside the app's control.** sift. writes to it and never reads it back — but its sharing settings are yours to manage. Keep it private.

## Deploying to Vercel

Import the repo into [Vercel](https://vercel.com) and set the environment variables below (they mirror `.env.example`):

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only: webhook + cron |
| `ALLOWED_EMAIL` | The single permitted login |
| `CRON_SECRET` | Shared secret to authenticate Vercel cron requests |
| `RESEND_API_KEY` | Resend API key for sending reminder emails |
| `REMINDER_FROM_EMAIL` | From address used for reminder emails |
| `REMINDER_TO_EMAIL` | Destination address for reminder emails |
| `TWILIO_ACCOUNT_SID` | Twilio account SID for WhatsApp reminders |
| `TWILIO_AUTH_TOKEN` | Twilio auth token; also validates inbound webhook signatures |
| `TWILIO_WHATSAPP_FROM` | WhatsApp sender, e.g. `whatsapp:+14155238886` (sandbox) |
| `WEBHOOK_PUBLIC_URL` | Exact URL configured in the Twilio console; required behind a proxy |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Google service account email for Sheets export |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Service account private key, `\n`-escaped |
| `GOOGLE_SHEETS_SPREADSHEET_ID` | Target spreadsheet ID for exports |

`vercel.json` schedules the reminder cron (`/api/cron/reminders`) daily at 12:00 UTC. Vercel sends `Authorization: Bearer $CRON_SECRET` with each invocation; generate a long random string for `CRON_SECRET` so nobody else can trigger it.

## Twilio WhatsApp sandbox

1. In the [Twilio console](https://console.twilio.com), open **Messaging → Try it out → Send a WhatsApp message** and join the sandbox by sending the join code from your phone.
2. Under the sandbox settings, point **"When a message comes in"** at `https://your-deployment.vercel.app/api/webhooks/twilio` (method POST).
3. Set `WEBHOOK_PUBLIC_URL` to that exact URL — Twilio signs requests against the URL it was given, and the app validates that signature, so the two must match character for character.

Then text something like `$14 chipotle` to the sandbox number and it lands on your ledger.

## Resend

Create an API key at [resend.com](https://resend.com), verify a sending domain (or use their onboarding address), and set `RESEND_API_KEY`, `REMINDER_FROM_EMAIL`, and `REMINDER_TO_EMAIL`. Bill reminders go out 3 days and 1 day before each due date; email is skipped silently when these are unset.

## Google Sheets export

1. In [Google Cloud console](https://console.cloud.google.com), create (or pick) a project and enable the **Google Sheets API**.
2. Create a **service account** and download a JSON key. Set `GOOGLE_SERVICE_ACCOUNT_EMAIL` to its `client_email` and `GOOGLE_SERVICE_ACCOUNT_KEY` to its `private_key` (keep the `\n` escapes when pasting into an env var).
3. Create the destination spreadsheet and **share it with the service account's email as Editor**.
4. Set `GOOGLE_SHEETS_SPREADSHEET_ID` to the ID from the sheet's URL.

The Export page then writes two tabs — `Transactions` (every entry) and `Summary` (a month × category pivot) — on demand. The export is one-way; the sheet is never read back.

## Testing

```bash
npm run test
```

Pure domain logic — the expense parser, money/date helpers, the month summary, the reminder engine, the Twilio signature check, and the Sheets payload builders — is unit-tested with Vitest. UI and database glue are covered by `npm run lint` and `npm run build`.
