# sift. — Build Plan

## 1. Goals

A personal finance web app that is simple to look at but does real work underneath: fast cost logging (including by text/SMS), a live budget dashboard, automated bill reminders, and a Google Sheets export for anyone who still wants to poke at the raw numbers in a spreadsheet.

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend | Next.js (App Router) + Tailwind | Matches your stack preference, good for PWA, fast to ship |
| Backend/DB | Supabase (Postgres) | Real relational DB, built-in auth, row-level security, Edge Functions for cron/webhooks |
| Hosting | Vercel | Native Next.js support, cron jobs, easy env management |
| Chatbot NLP | Rule-based parser (regex + keyword lookup) | Free, no API cost, handles the vast majority of short cost-logging messages |
| SMS/WhatsApp | Twilio | Two-way messaging for logging costs and sending reminders |
| Email | Resend | Simple transactional email API, pairs well with Next.js |
| Sheets export | Google Sheets API (service account) | One-way export/backup of clean data, not the source of truth |
| PWA | next-pwa or manual manifest + service worker | Installable on mobile, push notifications later if wanted |

## 3. Data Model (Supabase/Postgres)

- **users** — id, email, phone, timezone
- **categories** — id, user_id, name, icon, is_preset (Rent, Food, Transit, Utilities, Subscriptions, Entertainment, Health, Shopping, Other), editable by user
- **transactions** — id, user_id, amount, merchant, category_id, date, source (web/chat/sms), raw_input (original text, for auditing the NLP parse)
- **budgets** — id, user_id, category_id, monthly_limit, month
- **bills** — id, user_id, name, amount, due_day, category_id, recurrence (monthly/weekly/custom), active
- **reminders_log** — id, bill_id, channel (email/sms), sent_at, status

## 4. Core Features

### A. Cost logging (the core UX)
- Web form: quick-add card on the dashboard, amount + merchant + category autocomplete
- Chat panel in-app: type "$14 chipotle" → rule-based parser extracts it → confirms before saving
- SMS/WhatsApp: text a number to a Twilio number (e.g. "23.50 groceries") → webhook → parser runs → writes to Supabase → replies with confirmation and running category total
- Every chatbot-parsed entry stores the raw text alongside the structured result, so you can correct miscategorizations and grow the keyword list over time

### B. Budget dashboard
- Monthly overview: total spent vs. budgeted, per-category bars
- Trend view: month-over-month comparison
- Skeuomorphic "ledger" card for recent transactions (soft shadow, subtle paper/leather texture, tactile hover states) sitting on an otherwise clean, modern grid

### C. Bill reminder engine
- Vercel Cron (or Supabase Edge Function on a schedule) runs daily, checks `bills` for upcoming due dates
- Sends email (Resend) and SMS (Twilio) at configurable lead times (e.g. 3 days and 1 day before due)
- Logs every send to `reminders_log` so you can see reminder history and avoid duplicate sends

### D. Google Sheets export
- On-demand "Export to Sheets" button, plus an optional nightly sync job
- Pushes a clean snapshot (transactions + monthly summary) into a Sheet via a Google service account
- Sheets is a read/export destination only, never edited directly to avoid drift from the real DB

## 5. Cost-Logging Parser Flow (detail)

1. Message arrives (in-app chat or Twilio SMS/WhatsApp webhook)
2. Parser runs three steps on the raw text:
   - **Amount extraction**: regex pulls the first number, with or without a `$` and decimals (e.g. "23.50", "$14", "14 bucks")
   - **Merchant/description**: whatever text is left after removing the amount and filler words ("for", "on", "at")
   - **Category lookup**: match the remaining text against a keyword dictionary you control, e.g. `{"chipotle": "Food", "uber": "Transit", "netflix": "Subscriptions", "kroger": "Food", ...}`
3. If a keyword match is found, auto-save and reply with a confirmation ("Logged $14 - Chipotle - Food")
4. If no keyword matches, save it to "Uncategorized" and reply asking for a quick category pick (e.g. reply with a number 1-8 from a short list), so nothing gets lost even when the parser can't classify it
5. Every save writes to `transactions` with `source` and `raw_input` for traceability, and the keyword dictionary is just a table you can edit from the app (add "trader joe's" → Food once, never re-explain it)

This is entirely rule-based: no external API calls, no per-message cost. The only real maintenance is occasionally adding a new merchant keyword when something comes back "Uncategorized," which the app should surface as a lightweight nudge ("3 uncategorized this week, want to tag them?").

## 6. Design Direction

Modern skeuomorphism, used sparingly:
- Cards that feel like physical ledger pages or wallet slots (soft inner shadows, faint texture, rounded tactile edges)
- Buttons and toggles with a light "pressed" state on interaction
- Otherwise flat, modern typography and spacing so it doesn't read as dated or cluttered
- Fully responsive: desktop gets a multi-column dashboard, mobile collapses to a single-column feed with a floating quick-add button
- Will use the frontend-design skill's guidance when we get to actual component build, to avoid generic Tailwind-default look

## 7. Build Phases

1. **Foundation** — Supabase schema, auth, Next.js scaffold, deploy to Vercel
2. **Core logging + dashboard** — web quick-add form, transaction list, category breakdown
3. **Chatbot logging** — in-app chat first (simpler to test), then Twilio SMS/WhatsApp webhook
4. **Bill reminders** — bills table, cron job, email + SMS sending
5. **Sheets export** — service account setup, export function, optional nightly sync
6. **Polish** — skeuomorphic design pass, PWA manifest, mobile refinement

## 8. Accounts/Services You'll Need to Set Up

- Supabase project (free tier is fine to start)
- Vercel account (likely already have one)
- Twilio account + phone number (SMS) and WhatsApp sender approval if going that route
- Resend account for transactional email
- Google Cloud project with Sheets API enabled + service account JSON key

## 9. Assumptions Made

- Single-user app (not a shared household budget) — flag if that's wrong, it changes the auth/RLS model
- SMS/WhatsApp logging is for you only, no group/shared inbox
- Preset categories can be renamed/added later without a schema change (categories table already supports this)

## 10. Building This With Claude Fable 5 (Token-Efficient Approach)

Fable 5 is Anthropic's most capable public model, priced at $10/$50 per million input/output tokens (double Opus). It's built for exactly this kind of long-horizon, multi-phase build, but at that price the goal is to make every token count. A few concrete tactics:

**Front-load the spec, don't drip-feed it**
Fable 5 has a flat-rate 1M token context window (a 900K-token prompt costs the same per-token as a 9K one), and it performs best on long, well-specified tasks rather than back-and-forth clarification. Hand it this entire build plan in one go per phase, rather than describing the project piecemeal across many small messages. Every round of "wait, actually also do X" costs a full re-read of context.

**Reserve Fable 5 for the hard problems, route the rest to a cheaper model**
Not every task in this build needs frontier-tier reasoning. Inside Claude Code, use `/model` to switch:
- **Fable 5**: the parser's edge-case logic, the reminder-scheduling/timezone math, the Supabase RLS policies and schema design, the Sheets sync consistency logic — anything where a subtle bug is expensive to find later
- **Sonnet 5 or Haiku 4.5**: CRUD boilerplate, basic component scaffolding, Tailwind styling passes, straightforward form wiring
This single lever is the biggest cost saver, since most of a budgeting app is boilerplate, not hard reasoning.

**Use Claude Code on your subscription, not raw API billing, if you already pay for Pro/Max**
If you have a Claude Pro or Max plan, running Fable 5 through Claude Code's interactive terminal draws from your plan's included usage (weighted roughly 2x against your limits) rather than metered per-token API billing. That's a fixed monthly cost instead of a variable one. If you're on the API directly, this doesn't apply and every token is billed at the $10/$50 rate.

**Enable prompt caching**
Cached input tokens run at $1/million instead of $10/million, a 90% discount. This matters most for repeated context, like the schema and this build plan being referenced across many turns in one session. Claude Code handles this automatically in most cases; if you ever call the raw API, set `cache_control` on the reused blocks yourself.

**One phase, one focused session**
Work through the six build phases (Section 7) as separate sessions rather than one sprawling ever-growing conversation. A fresh session per phase keeps the context Fable re-processes each turn smaller, which keeps cost down without losing anything, since each phase is genuinely a separate concern (schema, then dashboard, then parser, then reminders, then Sheets, then polish).

**Batch anything non-interactive**
If you ever generate large amounts of content asynchronously (e.g. bulk-generating test data, or a one-off migration script), the Batch API is $5/$25, half the real-time rate, for work that doesn't need an instant reply.

Fable 5 access was restored on July 1, 2026 after a brief export-control suspension, so it's available to use right now.



## 11. Next Step

This plan is detailed enough to hand to Claude Code for implementation, phase by phase. Say the word and I can start scaffolding Phase 1 (Supabase schema + Next.js project structure) right here, or generate a more detailed technical spec first if you want to review the schema and API contracts before any code gets written.