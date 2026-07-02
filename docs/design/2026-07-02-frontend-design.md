# sift. — Frontend Design Plan

Date: 2026-07-02
Brief: `initial-build-plan.md` §6 — "Modern skeuomorphism, used sparingly: cards that feel like physical ledger pages… otherwise flat, modern typography and spacing… fully responsive; mobile collapses to a single-column feed with a floating quick-add button."
Method: `frontend-design` skill (token system → layout concept → signature element → self-critique against generic defaults → build).

## Design thesis

**A well-kept ledger.** sift. is the digital descendant of a hand-kept account book: the kind with a green cloth cover, cream ruled pages, and amounts entered in a steady hand. The interface is a quiet, modern desk surface, and exactly one object on it is allowed to be physical — the ledger page where your money is written down. Everything else (navigation, budget bars, forms, chat) is flat, disciplined, and gets out of the way.

The subject's world supplies every material in the palette: ledger paper, ruling feints, the red margin rule, banker-green bookcloth, business-machine numerals. Nothing is decorated for decoration's sake; every device encodes something true about the content.

## Tokens

### Color — 6 named values

| Token | Hex | Role |
|---|---|---|
| `ink` | `#23271F` | All primary text. Near-black with a green cast — writing ink, not screen-black. |
| `blotter` | `#E5E4DA` | App canvas. A desk-blotter gray-green felt. **The canvas is deliberately not cream** — paper is scarce here. |
| `page` | `#FBF6E9` | Ledger-card paper only. Never used as a general surface. |
| `banker` | `#1E3A2D` | Deep bookcloth green. Top bar, primary buttons, filled budget bars. |
| `debit` | `#A93F2E` | The ledger's red ink. The margin rule, over-budget states, delete actions. Semantic, never decorative. |
| `feint` | `#9FB6C4` | Ruling-line blue. Hairline rules on the ledger card, input underlines. Always sub-1px-feeling, always quiet. |

Derived tints (e.g. `banker` at 8% for hover washes, `ink` at 55% for secondary text) come from these six; no new hues may be introduced.

### Type — 3 roles

| Role | Face | Rationale |
|---|---|---|
| Display | **Besley** (700/800, tight leading) | A Clarendon — the letterform family of 19th-century banking, ticketing, and ledger headings. Used with restraint: page titles, the big monthly total, the wordmark "sift." |
| Body/UI | **Public Sans** (400/500/600) | Designed for government paperwork — forms are its native habitat, which is exactly what a budgeting app is. Neutral without reaching for the usual defaults. |
| Data | **IBM Plex Mono** (450/500, tabular by nature) | Descended from business-machine type — adding machines and tabulators. Every amount, date, and running total is set in it, right-aligned, so columns of money align to the cent the way a ledger column does. |

Scale: 13 / 15 (body) / 18 / 24 / 40 (monthly total, Besley). Amounts in lists: 15px Plex Mono. Sentence case everywhere; small-caps eyebrows only for column headings on the ledger card (DATE · ENTRY · AMOUNT), where a real ledger would have printed them.

### Materials — three layers, strictly separated

The interface is built from three materials, and each element belongs to exactly one:

1. **Blotter (the desk)** — the matte canvas everything sits on, with faint ambient color washes (feint blue, banker green at low opacity) that give the glass layer something to refract.
2. **Paper (the record)** — reserved for the ledger card and form inputs. Matte, opaque, ruled. **Paper is never glass**: the record of your money must feel permanent, so the ledger card gets no transparency, no blur, no sheen.
3. **Glass (the tools)** — liquid-glass treatment for everything that *floats above* the desk rather than lying on it: the sticky top bar, the quick-add and chat instrument panels, the mobile floating action button, and (in-app later) toasts and sheets. Recipe: translucent tint of the layer's base color (`page` at ~50% for light panels, `banker` at ~85% for dark chrome), `backdrop-filter: blur(14–16px) saturate(1.4)`, a 1px light border, an inset top highlight, and a soft specular gradient across the upper edge. An `@supports` fallback swaps to near-opaque fills where `backdrop-filter` is unsupported.

The same scarcity rule that governs skeuomorphism governs glass: it marks the *tool layer* only. Paper records, glass instruments, felt desk — if a new component doesn't clearly belong to one of the three, it's blotter-flat by default.

### Space, shape, elevation

- 8px base grid; card radius 10px (tactile, not pill-shaped); buttons 8px.
- **Elevation follows material.** The ledger card (paper) gets a soft two-layer shadow + faint inner edge shadow — paper lying on the blotter. Glass panels get the recipe above (blur, light border, specular top edge, gentle drop shadow — a pane hovering just off the desk). Nothing else casts a shadow. This scarcity is what keeps the skeuomorphism "sparing" as the brief demands.
- Pressed states (brief requirement): buttons translate down 1px and swap to an inset shadow on `:active` — a light mechanical press, applied to every button uniformly.

## Layout

### Desktop (≥1024px) — 12-column grid on the blotter

```
┌──────────────────────────────────────────────────────────────┐
│ ▓ banker-green bar   sift.        Dashboard Bills Export  ◍  │
├──────────────┬───────────────────────────┬───────────────────┤
│ (4 cols)     │ (5 cols)                  │ (3 cols)          │
│ JULY 2026    │ ╔═══════════════════════╗ │ Quick add         │
│ $1,284.50    │ ║  L E D G E R  (paper) ║ │ [amount]          │
│ of $2,400    │ ║ ┊ Jul 2  Chipotle     ║ │ [merchant]        │
│              │ ║ ┊       Food   14.00  ║ │ [category ▾]      │
│ Food     ▓▓░ │ ║ ┊ Jul 1  Uber         ║ │ ( Log expense )   │
│ Transit  ▓░░ │ ║ ┊       Transit 23.50 ║ │ ─────────────     │
│ Rent     ▓▓▓ │ ║ ┊ ──── ruled empty ── ║ │ Chat              │
│ Subs     ▓░░ │ ║ ┊ ──── lines continue ║ │ "$14 chipotle"    │
│ …            │ ╚═══════════════════════╝ │ ↳ parsed preview  │
└──────────────┴───────────────────────────┴───────────────────┘
```

- **Left:** month summary (Besley total) + per-category budget bars (flat, `banker` fill, `debit` fill when over).
- **Center:** the ledger card — the signature element, widest column, visually heaviest object on screen.
- **Right:** quick-add form and the chat logger, stacked. The chat echoes its parse ("Logged $14 — Chipotle — Food") in Plex Mono, like a till receipt.

### Mobile (<768px) — single-column feed

```
┌──────────────────┐
│ ▓ sift.        ◍ │
│ JULY  $1,284.50  │
│ Food    ▓▓▓░░    │
│ Transit ▓░░░░    │
│ ╔══════════════╗ │
│ ║ LEDGER  page ║ │
│ ║ ┊ entries…   ║ │
│ ╚══════════════╝ │
│            (＋)  │  ← floating quick-add, banker green,
└──────────────────┘     opens bottom sheet: form + chat input
```

## Signature element: the ruled ledger page

One memorable thing, executed precisely; everything else stays quiet.

The recent-transactions card is a **genuinely ruled page**, not a styled `<table>`:

1. **The rules exist independent of the content.** Horizontal `feint`-blue hairlines repeat at the row rhythm all the way down the card — including below the last entry. An empty ledger shows empty ruled lines, which doubles as the empty state: the first line reads *"Your first entry goes here — try `$14 chipotle`."*
2. **A single red vertical margin rule** (`debit`, 1px) runs top-to-bottom on the left; dates sit in the margin it creates, entries to the right of it — exactly how a ledger page is printed.
3. **Amounts align like money.** Right-aligned Plex Mono against the right edge, decimal points stacked. The month's running total sits beneath a double rule (the accountant's "totting line").
4. **New entries ink on.** When a transaction is logged, its row fades in with a 140ms opacity ramp and 1px settle — ink soaking into paper. This is the app's one orchestrated motion moment. `prefers-reduced-motion` renders it instantly with no animation.
5. **Paper, restrained.** `page` background, a barely-there grain (CSS noise at ~3% opacity), soft outer shadow + faint top inner shadow. No torn edges, no ring binders, no texture JPEGs.

## Copy voice

- Plain verbs, sentence case: **Log expense**, **Export to Sheets**, **Add bill**.
- Confirmations echo the parse verbatim: *"Logged $14.00 — Chipotle — Food."* The action keeps its name end-to-end (button "Log expense" → toast "Logged").
- Uncategorized nudge is an invitation, not a scold: *"3 entries this week have no category — tag them and sift. remembers next time."*
- Errors say what happened and what to do: *"Couldn't read an amount in that message. Start with a number, like `12.50 coffee`."*

## Quality floor (built in, not announced)

Responsive to 360px; visible keyboard focus (2px `banker` outline, offset 2px); `prefers-reduced-motion` respected; all text on `blotter`/`page` meets WCAG AA against `ink`; hit targets ≥44px on mobile; the FAB never overlaps the last ledger row (scroll padding).

## Self-critique against generic defaults (required by the skill)

Checked against the three known AI-design clichés:

1. **Warm cream + high-contrast serif + terracotta accent** — the nearest miss, since the brief itself demands paper. Differentiated deliberately: cream is confined to the one ledger card while the canvas is blotter gray-green (most generic designs flood the whole page cream); the display face is a Clarendon (slab, banking heritage), not the usual didone/garalde; the warm accent is a semantic ledger-red used only for debits/over-budget, and there is no terracotta anywhere. Where the brief pins skeuomorphic paper, the brief wins — the skill's rule — but the *composition* is not the default one.
2. **Near-black + acid green/vermilion accent** — not used.
3. **Broadsheet hairlines, zero radius, newspaper columns** — the hairlines here are content-bearing (they are the ledger's printed rules, present even when empty), and shapes stay rounded and tactile per the brief.

Revision made during this critique: the first draft had the entire app on cream with a paper-textured header — that *was* cliché #1. Inverted it: paper became scarce (one card), the canvas became the blotter, and the header became bookcloth green. Also cut a brass/gold sixth accent that read as decoration with no referent in the content.

## Mockup

A static, self-contained mockup of the dashboard implementing these tokens exactly lives at `docs/design/mockups/dashboard.html` (no build step — open in a browser). It is the visual contract for Phase 2/6 implementation; component code should derive every color and type decision from the token tables above.
