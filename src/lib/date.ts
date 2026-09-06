/**
 * Pure date/time formatting helpers with no Astro dependency, so they can be
 * shared between server-rendered pages and the client-side calendar script.
 */

/** Today's date as YYYY-MM-DD, evaluated in the given IANA time zone. */
export function todayISO(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

/**
 * "YYYY-MM-DD" -> "Sat, Sep 19, 2026".
 * Never parse the ISO string with `new Date(dateISO)` directly — that reads
 * as UTC midnight and can print the wrong day depending on the local time zone.
 */
export function formatDate(dateISO: string): string {
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/** "14:00", "16:00" -> "2:00 PM–4:00 PM". */
export function formatTimeRange(startTime: string, endTime: string): string {
  return `${formatTime(startTime)}–${formatTime(endTime)}`;
}

function formatTime(hm: string): string {
  const [hour, minute] = hm.split(":").map(Number);
  return new Date(2000, 0, 1, hour, minute).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}
