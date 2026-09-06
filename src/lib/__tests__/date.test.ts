import { beforeAll, describe, expect, it } from "vitest";
import { formatDate, formatTimeRange, todayISO } from "../date";

describe("todayISO", () => {
  it("resolves the date in the given time zone, even across the UTC day boundary", () => {
    // 2026-09-19T02:30:00Z is still the evening of 2026-09-18 in New York.
    const now = new Date("2026-09-19T02:30:00Z");
    expect(todayISO("America/New_York", now)).toBe("2026-09-18");
    expect(todayISO("UTC", now)).toBe("2026-09-19");
  });
});

describe("formatDate", () => {
  // Force a runner time zone with a large negative UTC offset: the classic
  // bug (`new Date("YYYY-MM-DD")`, which parses as UTC midnight) would print
  // the previous day here. formatDate must not regress to that.
  beforeAll(() => {
    process.env.TZ = "America/Los_Angeles";
  });

  it("shows the same calendar day the string names, regardless of runner time zone", () => {
    expect(formatDate("2026-01-01")).toContain("Jan 1,");
    expect(formatDate("2026-12-31")).toContain("Dec 31,");
  });
});

describe("formatTimeRange", () => {
  it("formats a 24-hour range as 12-hour times", () => {
    expect(formatTimeRange("14:00", "16:00")).toBe("2:00 PM–4:00 PM");
    expect(formatTimeRange("09:00", "09:30")).toBe("9:00 AM–9:30 AM");
  });
});
