/**
 * Everything a non-technical owner might want to change lives here.
 * Edit the values below — no other files need to change for a text update.
 */
export const site = {
  // An underscore marks where the blinking terminal cursor appears, e.g.
  // "COMMUNITY_NODE" renders as COMMUNITY[blinking _]NODE.
  brand: "COMMUNITY_NODE",
  tagline:
    "A community workshop for making things work again — and learning how they work in the first place.",
  aboutHeading: "> ABOUT THIS NODE",
  aboutPrimary:
    "Community-led workshops. Shared tools. Repair skills. No gatekeeping.",
  aboutSecondary:
    "This site is intentionally simple: a small public interface backed by services that handle registration and appointments.",
  location: "Community Workshop",
  contactEmail: "hello@example.com",

  /**
   * IANA time zone used to decide what "today" and "upcoming" mean when the
   * site is built (e.g. "America/New_York", "America/Chicago", "America/Los_Angeles").
   * Find yours at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   */
  timeZone: "America/New_York",
} as const;
