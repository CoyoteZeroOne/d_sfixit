/**
 * Single source of truth for workshop status display text, shared between
 * the server-rendered StatusTag component and the client-side calendar
 * script so the two can't drift out of sync.
 */
export const STATUS_LABELS = {
  open: "OPEN",
  full: "FULL",
  cancelled: "CANCELLED",
} as const;
