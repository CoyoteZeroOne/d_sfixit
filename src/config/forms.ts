/**
 * Where each form sends its answers. Everything goes to Web3Forms (a free service
 * that forwards form answers to your email), except signups once they're switched
 * to this site's own Worker (src/worker.ts) — see "Signup emails" in the README.
 */
export const FORM_ENDPOINTS = {
  signup: "https://api.web3forms.com/submit",
  signupWorker: "/api/signup",
  repair: "https://api.web3forms.com/submit",
} as const;

export const FORM_SUBJECTS = {
  signup: "Workshop signup",
  repair: "New repair request",
} as const;
