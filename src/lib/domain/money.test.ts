import { describe, expect, it } from "vitest";
import { formatCents, parseDollarsToCents } from "./money";

describe("formatCents", () => {
  it("formats 1400 cents as $14.00", () => {
    expect(formatCents(1400)).toBe("$14.00");
  });

  it("formats 120000 cents as $1,200.00 (US grouping)", () => {
    expect(formatCents(120000)).toBe("$1,200.00");
  });

  it("formats 0 cents as $0.00", () => {
    expect(formatCents(0)).toBe("$0.00");
  });

  it("formats 5 cents as $0.05", () => {
    expect(formatCents(5)).toBe("$0.05");
  });
});

describe("parseDollarsToCents", () => {
  it('parses "14.5" as 1450', () => {
    expect(parseDollarsToCents("14.5")).toBe(1450);
  });

  it('returns null for "" (empty string)', () => {
    expect(parseDollarsToCents("")).toBeNull();
  });

  it('returns null for "abc" (non-numeric)', () => {
    expect(parseDollarsToCents("abc")).toBeNull();
  });

  it('returns null for "0" (zero is <=0)', () => {
    expect(parseDollarsToCents("0")).toBeNull();
  });

  it('returns null for "-5" (negative is <=0)', () => {
    expect(parseDollarsToCents("-5")).toBeNull();
  });

  it('returns null for "12.345" (more than 2 decimal places)', () => {
    expect(parseDollarsToCents("12.345")).toBeNull();
  });

  it('parses "$14.50" (leading dollar sign tolerated)', () => {
    expect(parseDollarsToCents("$14.50")).toBe(1450);
  });

  it('parses "  20  " (trims surrounding whitespace)', () => {
    expect(parseDollarsToCents("  20  ")).toBe(2000);
  });

  it('parses "1200" as 120000 (whole dollars, no decimal)', () => {
    expect(parseDollarsToCents("1200")).toBe(120000);
  });

  it("parses exactly $100,000 (the ceiling)", () => {
    expect(parseDollarsToCents("100000")).toBe(10_000_000);
  });

  it("returns null just above the ceiling", () => {
    expect(parseDollarsToCents("100000.01")).toBeNull();
  });

  it("returns null for absurdly large values that would overflow the DB integer column", () => {
    expect(parseDollarsToCents("99999999999999999999")).toBeNull();
  });
});
