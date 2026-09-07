/**
 * Everything a non-technical owner might want to change lives here.
 * Edit the values below — no other files need to change for a text update.
 */
export const site = {
  // An underscore marks where the blinking terminal cursor appears, e.g.
  // "Ds_FIXIT" renders as Ds[blinking _]FIXIT.
  brand: "Ds_FIXIT",
  tagline: "This is where THE MACHINE comes to DIE and BE REBORN",
  aboutHeading: "> ABOUT THIS NODE",
  aboutPrimary:
    "Teaching tech to all-comers! No skill? No judgement. Learn to fix your own shit with friends, or leave it on my desk for a no-cost repair.",
  aboutSecondary:
    "This site is how I handle my repair queue and workshop calendar. Leave me a note here describing your repair issue, and keep an eye out here for community fixit workshops, hackathons, and tech talks.",
  location: "Community Workshop",
  contactEmail: "dsfixit01@gmail.com",

  /**
   * IANA time zone used to decide what "today" and "upcoming" mean when the
   * site is built (e.g. "America/New_York", "America/Chicago", "America/Los_Angeles").
   * Find yours at https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
   */
  timeZone: "America/Chicago",
} as const;
