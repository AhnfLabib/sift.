// One-way, on-demand export of the full ledger to a Google Sheet the user
// owns. The sheet is never read back — sift.'s database stays the source of
// truth. Auth is a service account (JWT) that the user has shared the
// spreadsheet with; data access is the signed-in user's own rows via the
// cookie-bound client (RLS), never the service role.

import "server-only";

import { JWT } from "google-auth-library";

import { createServerSupabase } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/db/types";
import { buildSummaryRows, buildTransactionsRows } from "./payload";

const SHEETS_API = "https://sheets.googleapis.com/v4/spreadsheets";
const TABS = ["Transactions", "Summary"] as const;

type ExportTransaction = Transaction & { category: { name: string } | null };

function getSheetsConfig(): {
  email: string;
  key: string;
  spreadsheetId: string;
} {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const key = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;
  if (!email || !key || !spreadsheetId) {
    throw new Error(
      "Google Sheets export isn't configured. Set GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_KEY, and GOOGLE_SHEETS_SPREADSHEET_ID."
    );
  }
  // Deploy environments store the PEM key with literal "\n" escapes; undo
  // them so the JWT signer sees real newlines.
  return { email, key: key.replace(/\\n/g, "\n"), spreadsheetId };
}

async function getAccessToken(email: string, key: string): Promise<string> {
  const jwt = new JWT({
    email,
    key,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  const { token } = await jwt.getAccessToken();
  if (!token) {
    throw new Error("Couldn't get a Google access token for the service account.");
  }
  return token;
}

async function sheetsFetch(
  token: string,
  url: string,
  init?: RequestInit
): Promise<unknown> {
  const res = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Google Sheets request failed (${res.status}): ${body}`);
  }
  return res.json();
}

/** Creates any of the Transactions/Summary tabs that don't exist yet. */
async function ensureTabs(token: string, spreadsheetId: string): Promise<void> {
  const spreadsheet = (await sheetsFetch(
    token,
    `${SHEETS_API}/${spreadsheetId}?fields=sheets.properties.title`
  )) as { sheets?: { properties: { title: string } }[] };

  const existing = new Set(
    (spreadsheet.sheets ?? []).map((sheet) => sheet.properties.title)
  );
  const missing = TABS.filter((tab) => !existing.has(tab));
  if (missing.length === 0) return;

  await sheetsFetch(token, `${SHEETS_API}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: missing.map((title) => ({ addSheet: { properties: { title } } })),
    }),
  });
}

async function writeTab(
  token: string,
  spreadsheetId: string,
  tab: string,
  values: (string | number)[][]
): Promise<void> {
  const range = encodeURIComponent(tab);
  await sheetsFetch(
    token,
    `${SHEETS_API}/${spreadsheetId}/values/${range}:clear`,
    { method: "POST" }
  );
  await sheetsFetch(
    token,
    `${SHEETS_API}/${spreadsheetId}/values/${range}?valueInputOption=RAW`,
    { method: "PUT", body: JSON.stringify({ values }) }
  );
}

/**
 * Month × category-name pivot input for `buildSummaryRows`, from the full
 * transaction list. Uncategorized spend gets its own "Uncategorized" column,
 * matching the dashboard's pseudo-category.
 */
function summarizeByMonth(
  txs: ExportTransaction[]
): { month: string; byCategory: Record<string, number> }[] {
  const byMonth = new Map<string, Record<string, number>>();
  for (const tx of txs) {
    const month = tx.date.slice(0, 7); // "YYYY-MM-DD" -> "YYYY-MM"
    const categoryName = tx.category?.name ?? "Uncategorized";
    const bucket = byMonth.get(month) ?? {};
    bucket[categoryName] = (bucket[categoryName] ?? 0) + tx.amount_cents;
    byMonth.set(month, bucket);
  }
  return [...byMonth.entries()].map(([month, byCategory]) => ({
    month,
    byCategory,
  }));
}

/**
 * Exports every transaction (plus a monthly summary pivot) to the configured
 * spreadsheet. Returns the number of transactions written and the sheet URL.
 */
export async function exportToSheets(): Promise<{ rows: number; url: string }> {
  const { email, key, spreadsheetId } = getSheetsConfig();

  const supabase = await createServerSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select("*, category:categories(name)")
    .order("date", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;

  const transactions = (data ?? []) as ExportTransaction[];

  const token = await getAccessToken(email, key);
  await ensureTabs(token, spreadsheetId);
  await writeTab(token, spreadsheetId, "Transactions", buildTransactionsRows(transactions));
  await writeTab(token, spreadsheetId, "Summary", buildSummaryRows(summarizeByMonth(transactions)));

  return {
    rows: transactions.length,
    url: `https://docs.google.com/spreadsheets/d/${spreadsheetId}`,
  };
}
