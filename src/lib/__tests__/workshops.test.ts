import { describe, expect, it } from "vitest";
import { getNext, getUpcoming, hasEnded, sortWorkshops } from "../workshops";
import type { Workshop } from "../workshops";

function workshop(
  overrides: Partial<Workshop> & Pick<Workshop, "id" | "date">,
): Workshop {
  return {
    title: overrides.id,
    startTime: "14:00",
    endTime: "16:00",
    location: "Community Workshop",
    capacity: 10,
    status: "open",
    description: "",
    ...overrides,
  };
}

describe("sortWorkshops / getUpcoming / getNext", () => {
  const workshops = [
    workshop({ id: "c", date: "2026-09-26" }),
    workshop({ id: "a", date: "2026-09-19" }),
    workshop({ id: "past", date: "2026-01-01" }),
    workshop({
      id: "cancelled-first",
      date: "2026-09-20",
      status: "cancelled",
    }),
  ];

  it("sorts by date ascending", () => {
    expect(sortWorkshops(workshops).map((w) => w.id)).toEqual([
      "past",
      "a",
      "cancelled-first",
      "c",
    ]);
  });

  it("drops workshops before today", () => {
    const upcoming = getUpcoming(
      workshops,
      "UTC",
      new Date("2026-09-19T12:00:00Z"),
    );
    expect(upcoming.map((w) => w.id)).toEqual(["a", "cancelled-first", "c"]);
  });

  it("skips cancelled workshops when picking the next one", () => {
    const next = getNext(workshops, "UTC", new Date("2026-09-19T12:00:00Z"));
    expect(next?.id).toBe("a");
  });
});

describe("hasEnded", () => {
  const today = workshop({ id: "today", date: "2026-10-11" });

  it("is false before the end time and true from it, in the given time zone", () => {
    // 20:59 / 21:00 UTC is 15:59 / 16:00 in Chicago (CDT, UTC-5).
    expect(
      hasEnded(today, "America/Chicago", new Date("2026-10-11T20:59:00Z")),
    ).toBe(false);
    expect(
      hasEnded(today, "America/Chicago", new Date("2026-10-11T21:00:00Z")),
    ).toBe(true);
  });

  it("treats a later day as ended and an earlier day as not", () => {
    expect(hasEnded(today, "UTC", new Date("2026-10-12T00:00:00Z"))).toBe(true);
    expect(hasEnded(today, "UTC", new Date("2026-10-10T23:59:00Z"))).toBe(
      false,
    );
  });
});
