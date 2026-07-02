// Pure, dependency-free rule-based expense message parser.
// "$14 chipotle" -> { amountCents: 1400, merchant: "Chipotle", categoryId: "food", matchedKeyword: "chipotle" }

export interface KeywordEntry {
  keyword: string;
  categoryId: string;
}

export interface ParsedExpense {
  amountCents: number;
  merchant: string; // title-cased; "Unknown" when only an amount was given
  categoryId: string | null; // from keyword match, else null
  matchedKeyword: string | null;
}

const AMOUNT_RE = /^\$?\d{1,6}(?:,\d{3})*(?:\.\d{1,2})?$/;
const DOLLAR_WORDS = new Set(["bucks", "dollars", "usd"]);
const FILLER_WORDS = new Set(["for", "on", "at", "i", "spent", "paid"]);
const MAX_AMOUNT_CENTS = 100_000 * 100;

interface Candidate {
  value: number;
  dollarMarked: boolean;
  hasDecimal: boolean;
  consumedIndices: number[];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleCaseWord(word: string): string {
  if (word.length === 0) return word;
  return word[0].toUpperCase() + word.slice(1).toLowerCase();
}

function titleCase(text: string): string {
  return text.split(" ").map(titleCaseWord).join(" ");
}

function findCandidates(tokens: string[]): Candidate[] {
  const candidates: Candidate[] = [];
  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    if (!AMOUNT_RE.test(token)) continue;

    const dollarPrefixed = token.startsWith("$");
    const numeric = token.slice(dollarPrefixed ? 1 : 0).replace(/,/g, "");
    const value = parseFloat(numeric);
    const hasDecimal = numeric.includes(".");
    const consumedIndices = [i];
    let dollarMarked = dollarPrefixed;

    if (!dollarPrefixed) {
      const next = tokens[i + 1];
      if (next !== undefined && DOLLAR_WORDS.has(next.toLowerCase())) {
        dollarMarked = true;
        consumedIndices.push(i + 1);
      }
    }

    candidates.push({ value, dollarMarked, hasDecimal, consumedIndices });
  }
  return candidates;
}

function chooseAmount(candidates: Candidate[]): Candidate | null {
  const dollarMarked = candidates.filter((c) => c.dollarMarked);
  if (dollarMarked.length > 0) {
    return dollarMarked[0];
  }

  if (candidates.length === 1) {
    return candidates[0];
  }

  const decimalBearing = candidates.filter((c) => c.hasDecimal);
  if (decimalBearing.length > 0) {
    let max = -Infinity;
    let winners: Candidate[] = [];
    for (const c of decimalBearing) {
      if (c.value > max) {
        max = c.value;
        winners = [c];
      } else if (c.value === max) {
        winners.push(c);
      }
    }
    if (winners.length !== 1) return null; // strict max tie -> ambiguous
    return winners[0];
  }

  // multiple plain integers -> ambiguous
  return null;
}

function matchCategory(
  merchantText: string,
  keywords: KeywordEntry[],
): { categoryId: string | null; matchedKeyword: string | null } {
  let best: KeywordEntry | null = null;
  for (const entry of keywords) {
    const regex = new RegExp(`\\b${escapeRegExp(entry.keyword)}\\b`, "i");
    if (regex.test(merchantText) && (!best || entry.keyword.length > best.keyword.length)) {
      best = entry;
    }
  }
  return best
    ? { categoryId: best.categoryId, matchedKeyword: best.keyword }
    : { categoryId: null, matchedKeyword: null };
}

export function parseExpense(raw: string, keywords: KeywordEntry[]): ParsedExpense | null {
  const trimmed = raw.trim();
  if (trimmed.length === 0) return null;

  const tokens = trimmed.split(/\s+/);
  const candidates = findCandidates(tokens);
  if (candidates.length === 0) return null;

  const chosen = chooseAmount(candidates);
  if (!chosen) return null;

  const amountCents = Math.round(chosen.value * 100);
  if (amountCents === 0 || amountCents > MAX_AMOUNT_CENTS) return null;

  const consumed = new Set(chosen.consumedIndices);
  const remainingTokens = tokens.filter(
    (token, index) => !consumed.has(index) && !FILLER_WORDS.has(token.toLowerCase()),
  );
  const merchantText = remainingTokens.join(" ");
  const merchant = merchantText.length === 0 ? "Unknown" : titleCase(merchantText);

  const { categoryId, matchedKeyword } =
    merchantText.length === 0
      ? { categoryId: null, matchedKeyword: null }
      : matchCategory(merchantText, keywords);

  return { amountCents, merchant, categoryId, matchedKeyword };
}
