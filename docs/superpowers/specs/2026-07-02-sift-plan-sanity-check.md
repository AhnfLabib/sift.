# sift. — Build Plan Sanity Check & Revised Spec

Date: 2026-07-02
Input: `initial-build-plan.md`
Method: superpowers `brainstorming` skill (explore context → challenge assumptions → YAGNI → propose alternatives → written spec)

## Verdict

The plan is fundamentally sound. The stack (Next.js + Supabase + Vercel) is coherent and free-tier friendly, the phase order is right (in-app chat before SMS is the correct de-risking move), the rule-based parser is the right call for short cost messages, and treating Google Sheets as an export-only destination avoids the two-way-sync trap entirely.

It is **not** ready to hand to implementation as-is. The data model has six concrete gaps, the SMS path hides significantly more operational friction than the plan acknowledges, and a few features should be cut from v1. Everything below is organized as: what holds up, what must change, what to cut, decisions made, and open questions.

## What holds up (no changes)

- **Stack choices** — Next.js App Router + Tailwind + Supabase + Vercel. No notes.
- **Phasing** — foundation → logging/dashboard → chat → SMS → reminders → export → polish. Correct order; each phase is independently shippable.
- **Rule-based parser** — right tool. Short cost messages ("$14 chipotle") are a constrained grammar; an LLM here would add cost and latency for no accuracy gain. Storing `raw_input` for auditing parses is a genuinely good idea.
- **Sheets as one-way export** — correct. The moment Sheets becomes writable you have a distributed-consistency problem in a budgeting app.
- **Uncategorized-never-lost principle** — saving unparseable entries rather than rejecting them is the right failure mode.

## Issues found — must fix before Phase 1

### 1. The keyword dictionary is missing from the data model
Section 5 says the keyword dictionary "is just a table you can edit from the app," but Section 3 has no such table. Add:

```
merchant_keywords — id, user_id, keyword (citext, unique per user), category_id, created_at
```

Parser matches longest keyword first (so "trader joe's" beats "joe's").

### 2. `users` table conflicts with Supabase auth
Supabase already owns `auth.users`. A parallel `users` table invites drift. Replace with:

```
profiles — id (FK → auth.users.id), phone, timezone, created_at
```

Since this is single-user: **disable public signup** in Supabase auth settings after creating the one account. RLS policies stay standard (`user_id = auth.uid()`) so a future multi-user pivot doesn't require a rewrite.

### 3. Money must not be a float
Store `amount` as `integer` cents (or `numeric(12,2)`; pick cents and be done). Applies to `transactions`, `budgets.monthly_limit`, `bills.amount`. Floating point in a finance app is a slow-motion bug.

### 4. `budgets.month` is underspecified
Use `date` normalized to the first of the month, with `UNIQUE (user_id, category_id, month)`. Also decide rollover behavior — see Decisions below.

### 5. `reminders_log` cannot actually prevent duplicate sends as written
The plan claims the log avoids duplicates, but the listed columns (`bill_id, channel, sent_at, status`) can't express "already reminded for *this* due date at *this* lead time." Add `due_date` and `lead_days`, then:

```
UNIQUE (bill_id, due_date, lead_days, channel)
```

The daily cron inserts with `ON CONFLICT DO NOTHING`; a crashed-and-retried run becomes harmless.

### 6. `bills.due_day` has calendar edge cases, and weekly recurrence doesn't fit it
- `due_day = 31` in February: clamp to last day of month (`LEAST(due_day, days_in_month)` in the cron query).
- Weekly recurrence can't be expressed by a day-of-month column at all, and "custom" recurrence is an open-ended rabbit hole. **Cut both** (see YAGNI). `recurrence` column stays for later, constrained to `'monthly'` in v1.

### 7. "Uncategorized" needs a definition
Make `transactions.category_id` nullable; NULL means uncategorized. This is distinct from the user deliberately picking "Other". The dashboard's nudge ("3 uncategorized this week") is then a trivial `WHERE category_id IS NULL` count.

### 8. Timezones are mentioned once and then ignored
Two places they bite:
- **Transaction date** — "logged at 11:30pm" must not land on tomorrow's date. Resolve the calendar date in the user's `profiles.timezone` at write time; store as `date`.
- **Reminder cron** — "3 days before due" must be computed against today-in-user-timezone, not UTC, or reminders drift by a day around midnight.

## Hidden complexity the plan underestimates

### 9. Twilio US SMS is not "sign up and text"
US A2P 10DLC registration (brand + campaign) is now mandatory even for personal/low-volume use — it costs money and takes days-to-weeks of approval, and toll-free numbers require their own verification. This doesn't change the architecture, but it means **SMS should not gate any earlier phase**, and the WhatsApp sandbox is worth considering as the personal-use channel since it skips 10DLC. Also required when it lands:
- Validate Twilio webhook signatures (`X-Twilio-Signature`) — this endpoint writes to your database.
- Map inbound phone → `profiles.phone`; silently drop messages from unknown numbers.

### 10. The SMS "reply 1–8 to categorize" flow needs conversational state
A numbered reply is only meaningful relative to the *previous* message, which means storing a pending-clarification state per phone number. That's a real feature, not a footnote. **v1 behavior:** unmatched SMS entries save as Uncategorized and the reply says so ("Logged $23.50 — uncategorized. Tag it in the app."). The numbered-reply flow becomes a later enhancement with its own `pending_clarifications` table.

### 11. The parser needs its v1 grammar pinned down now
Otherwise scope oozes. v1 rules:
- Amount = first currency-like token (`$14`, `14`, `23.50`, `14 bucks`). Two ambiguous number tokens ("2 coffees 8.50") → larger decimal-bearing token wins; if still ambiguous, treat as unparsed.
- Date = always today (user's timezone). No "yesterday" parsing in v1.
- No negative amounts / refunds in v1 (web form can handle a refund as a manual negative entry later).
- Merchant = remaining text minus filler words ("for", "on", "at"), title-cased.
- Category = longest matching `merchant_keywords` entry, else NULL.

### 12. Sheets export: one setup gotcha, one cut
- The target spreadsheet must be manually shared with the service account's email — document this in setup, it's the #1 support trap with service accounts.
- Nightly sync: cut from v1 (see YAGNI). The on-demand button covers the actual need; the cron slot on Vercel's free tier is better spent on reminders.

## YAGNI cuts (v1 scope)

| Cut | Why | Cost to add later |
|---|---|---|
| Weekly/custom bill recurrence | Doesn't fit the schema; monthly covers rent/utilities/subscriptions | Low — column already exists |
| Nightly Sheets sync | On-demand export covers it; saves a cron + failure mode | Low |
| SMS numbered-reply categorization | Needs conversational state machine | Medium — additive table |
| Push notifications | Email + SMS already cover reminders | Medium |
| Multi-currency | Single user, single country | High — do not attempt later without need |
| Month-over-month "trend view" beyond a simple comparison | Current vs. last month bars is the 90% case | Low |

## Decisions made (flag if wrong)

1. **USD only**, amounts in integer cents.
2. **Budgets do not auto-roll** month to month. A "copy last month's budgets" button appears when a new month has no rows. (Auto-copy silently perpetuates stale budgets; the plan didn't specify either way.)
3. **Transactions are editable and deletable** in the web UI (miscategorized chat entries get fixed there).
4. **Category presets are seeded per-user at first login** (the 9 presets from the plan), via app code — not a DB trigger — so it's debuggable.
5. **Reminder lead times** default to 3 days and 1 day, stored per-bill later if needed; v1 keeps them global constants.
6. **Bill reminders run via Vercel Cron hitting a Next.js route** (protected by `CRON_SECRET`), not a Supabase Edge Function. One codebase, one deploy target, easier local testing. Supabase Edge Functions remain the fallback if Vercel cron limits ever pinch.

## Note on Section 10 ("Building This With Claude…")

This section is about how to operate the AI tooling while building, not about the product — it has no bearing on schema, code, or design, and several of its specific claims (pricing figures, usage weighting, the "export-control suspension" anecdote) are unverifiable from here. Treat it as non-normative commentary; nothing in the implementation should depend on it.

## Revised data model (summary)

```
profiles            id (=auth.users.id), phone, timezone, created_at
categories          id, user_id, name, icon, is_preset, created_at
merchant_keywords   id, user_id, keyword, category_id, created_at
                      UNIQUE (user_id, keyword)
transactions        id, user_id, amount_cents, merchant, category_id (nullable),
                    date, source ('web'|'chat'|'sms'), raw_input, created_at
budgets             id, user_id, category_id, limit_cents, month (date, first-of-month)
                      UNIQUE (user_id, category_id, month)
bills               id, user_id, name, amount_cents, due_day (1–31, clamped),
                    category_id, recurrence ('monthly'), active, created_at
reminders_log       id, bill_id, due_date, lead_days, channel ('email'|'sms'),
                    sent_at, status
                      UNIQUE (bill_id, due_date, lead_days, channel)
```

All tables carry RLS: `user_id = auth.uid()` (service-role key used only by the Twilio webhook and cron routes).

## Open questions for review

1. **USD-only confirmed?** (Decision 1 assumes yes.)
2. **Monthly-only bills acceptable for v1?** (Weekly recurrence cut.)
3. **SMS vs. WhatsApp** — given A2P 10DLC friction, is WhatsApp sandbox acceptable as the personal messaging channel, at least initially?

## Next step

Frontend design plan (see `docs/design/2026-07-02-frontend-design.md`), then implementation via the subagent-driven-dev skill, phase by phase per the revised spec above.
