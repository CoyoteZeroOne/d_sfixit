import {
  PUBLIC_SIGNUP_VIA_WORKER,
  PUBLIC_TURNSTILE_SITE_KEY,
  PUBLIC_WEB3FORMS_ACCESS_KEY,
} from "astro:env/client";

export const web3FormsAccessKey = PUBLIC_WEB3FORMS_ACCESS_KEY;
export const isFormsConfigured = Boolean(web3FormsAccessKey);

export const turnstileSiteKey = PUBLIC_TURNSTILE_SITE_KEY;
// Signups switch to the Worker only once both build variables are set in
// Cloudflare: PUBLIC_SIGNUP_VIA_WORKER=true and PUBLIC_TURNSTILE_SITE_KEY (the
// Worker refuses signups that skip the Turnstile bot check). Until then: Web3Forms.
export const isSignupViaWorker =
  PUBLIC_SIGNUP_VIA_WORKER && Boolean(turnstileSiteKey);
