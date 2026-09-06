/**
 * V1: forms POST straight to Web3Forms (a free third-party inbox-relay).
 * V2: swap these two constants for same-origin Worker routes (e.g. "/api/signup",
 * "/api/repair") once a Cloudflare Worker is added to this project — the HTML
 * form field names below are already chosen to match that future request body,
 * so no template changes are needed.
 */
export const FORM_ENDPOINTS = {
  signup: "https://api.web3forms.com/submit",
  repair: "https://api.web3forms.com/submit",
} as const;

export const FORM_SUBJECTS = {
  signup: "Workshop signup",
  repair: "New repair request",
} as const;
