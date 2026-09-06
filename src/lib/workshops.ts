import type { CollectionEntry } from "astro:content";
import { todayISO } from "./date";

export type Workshop = CollectionEntry<"workshops">["data"];

export function sortWorkshops(workshops: Workshop[]): Workshop[] {
  return [...workshops].sort((a, b) => sortKey(a).localeCompare(sortKey(b)));
}

/** Workshops on or after today, soonest first. Frozen at build time. */
export function getUpcoming(
  workshops: Workshop[],
  timeZone: string,
  now: Date = new Date(),
): Workshop[] {
  const today = todayISO(timeZone, now);
  return sortWorkshops(workshops.filter((workshop) => workshop.date >= today));
}

/** The soonest upcoming workshop that hasn't been cancelled, if any. */
export function getNext(
  workshops: Workshop[],
  timeZone: string,
  now: Date = new Date(),
): Workshop | undefined {
  return getUpcoming(workshops, timeZone, now).find(
    (workshop) => workshop.status !== "cancelled",
  );
}

function sortKey(workshop: Pick<Workshop, "date" | "startTime">): string {
  return `${workshop.date}T${workshop.startTime}`;
}
