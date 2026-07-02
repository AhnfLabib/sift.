import { describe, expect, it } from "vitest";
import {
  addDaysISO,
  clampDueDay,
  monthStart,
  prevMonthStart,
  todayInTz,
} from "./dates";

describe("todayInTz", () => {
  it("11:30pm ET on Jul 2 (03:30 UTC Jul 3) is still Jul 2 in America/New_York", () => {
    const now = new Date("2026-07-03T03:30:00Z");
    expect(todayInTz("America/New_York", now)).toBe("2026-07-02");
  });

  it("the same instant is already Jul 3 in Asia/Tokyo", () => {
    const now = new Date("2026-07-03T03:30:00Z");
    expect(todayInTz("Asia/Tokyo", now)).toBe("2026-07-03");
  });

  it("defaults `now` to the current time when omitted", () => {
    const result = todayInTz("UTC");
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe("monthStart", () => {
  it('"2026-07-15" -> "2026-07-01"', () => {
    expect(monthStart("2026-07-15")).toBe("2026-07-01");
  });

  it('"2026-01-01" -> "2026-01-01" (already month start)', () => {
    expect(monthStart("2026-01-01")).toBe("2026-01-01");
  });
});

describe("addDaysISO", () => {
  it('"2026-07-30" + 3 -> "2026-08-02" (crosses month boundary)', () => {
    expect(addDaysISO("2026-07-30", 3)).toBe("2026-08-02");
  });

  it('"2026-12-30" + 5 -> "2027-01-04" (crosses year boundary)', () => {
    expect(addDaysISO("2026-12-30", 5)).toBe("2027-01-04");
  });

  it('"2026-07-10" + (-5) -> "2026-07-05" (negative days)', () => {
    expect(addDaysISO("2026-07-10", -5)).toBe("2026-07-05");
  });

  it('"2026-02-28" + 1 -> "2026-03-01" (non-leap Feb rollover)', () => {
    expect(addDaysISO("2026-02-28", 1)).toBe("2026-03-01");
  });

  it('"2028-02-28" + 1 -> "2028-02-29" (leap Feb rollover)', () => {
    expect(addDaysISO("2028-02-28", 1)).toBe("2028-02-29");
  });
});

describe("clampDueDay", () => {
  it("31 in Feb 2026 (non-leap) clamps to 28", () => {
    expect(clampDueDay(31, "2026-02-10")).toBe(28);
  });

  it("31 in Feb 2028 (leap) clamps to 29", () => {
    expect(clampDueDay(31, "2028-02-10")).toBe(29);
  });

  it("15 in Feb 2026 stays 15 (no clamping needed)", () => {
    expect(clampDueDay(15, "2026-02-10")).toBe(15);
  });

  it("31 in a 31-day month stays 31", () => {
    expect(clampDueDay(31, "2026-07-10")).toBe(31);
  });

  it("31 in a 30-day month clamps to 30", () => {
    expect(clampDueDay(31, "2026-04-10")).toBe(30);
  });
});

describe("prevMonthStart", () => {
  it('"2026-07-01" -> "2026-06-01"', () => {
    expect(prevMonthStart("2026-07-01")).toBe("2026-06-01");
  });

  it('"2026-01-01" -> "2025-12-01" (crosses year boundary)', () => {
    expect(prevMonthStart("2026-01-01")).toBe("2025-12-01");
  });
});
