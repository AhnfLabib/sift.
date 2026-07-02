import { describe, expect, it } from "vitest";
import { parseExpense, type KeywordEntry } from "./parse";

const KW: KeywordEntry[] = [
  { keyword: "chipotle", categoryId: "food" },
  { keyword: "trader joe's", categoryId: "food" },
  { keyword: "joe's", categoryId: "coffee" },
  { keyword: "uber", categoryId: "transit" },
];

describe("parseExpense", () => {
  it('parses "$14 chipotle"', () => {
    expect(parseExpense("$14 chipotle", KW)).toMatchObject({
      amountCents: 1400,
      merchant: "Chipotle",
      categoryId: "food",
      matchedKeyword: "chipotle",
    });
  });

  it('parses "23.50 groceries"', () => {
    expect(parseExpense("23.50 groceries", KW)).toMatchObject({
      amountCents: 2350,
      merchant: "Groceries",
      categoryId: null,
    });
  });

  it('parses "14 bucks for tacos"', () => {
    expect(parseExpense("14 bucks for tacos", KW)).toMatchObject({
      amountCents: 1400,
      merchant: "Tacos",
    });
  });

  it('parses "spent 8.75 at Trader Joe\'s" (longest keyword beats "joe\'s")', () => {
    expect(parseExpense("spent 8.75 at Trader Joe's", KW)).toMatchObject({
      amountCents: 875,
      merchant: "Trader Joe's",
      categoryId: "food",
      matchedKeyword: "trader joe's",
    });
  });

  it('parses "uber 23"', () => {
    expect(parseExpense("uber 23", KW)).toMatchObject({
      amountCents: 2300,
      merchant: "Uber",
      categoryId: "transit",
    });
  });

  it('parses "$1,200 rent"', () => {
    expect(parseExpense("$1,200 rent", KW)).toMatchObject({
      amountCents: 120000,
      merchant: "Rent",
    });
  });

  it('parses "$20" as amount-only, merchant "Unknown"', () => {
    expect(parseExpense("$20", KW)).toMatchObject({
      amountCents: 2000,
      merchant: "Unknown",
    });
  });

  it('parses "2 coffees 8.50" (decimal beats plain int; unchosen number stays in merchant)', () => {
    expect(parseExpense("2 coffees 8.50", KW)).toMatchObject({
      amountCents: 850,
      merchant: "2 Coffees",
    });
  });

  it('returns null for "2 coffees 3 donuts" (two plain ints, ambiguous)', () => {
    expect(parseExpense("2 coffees 3 donuts", KW)).toBeNull();
  });

  it('parses "1.50 x 2.50" (two decimal candidates, strict max wins; unchosen token stays in merchant)', () => {
    expect(parseExpense("1.50 x 2.50", KW)).toMatchObject({
      amountCents: 250,
      merchant: "1.50 X",
    });
  });

  it('returns null for "lunch with sam" (no amount)', () => {
    expect(parseExpense("lunch with sam", KW)).toBeNull();
  });

  it('returns null for "$0 water" (zero amount rejected)', () => {
    expect(parseExpense("$0 water", KW)).toBeNull();
  });

  it('returns null for "$200000 car" (over cap)', () => {
    expect(parseExpense("$200000 car", KW)).toBeNull();
  });

  it('parses "  $9.99   NETFLIX  " (trims, collapses whitespace, title-cases)', () => {
    expect(parseExpense("  $9.99   NETFLIX  ", KW)).toMatchObject({
      amountCents: 999,
      merchant: "Netflix",
    });
  });

  it("returns categoryId: null when keyword list is empty", () => {
    expect(parseExpense("$14 chipotle", [])).toMatchObject({
      categoryId: null,
    });
  });
});
