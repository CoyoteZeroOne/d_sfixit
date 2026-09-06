// @ts-check
import { defineConfig, envField } from "astro/config";

// Best-effort placeholder — Cloudflare will actually serve this at
// https://dsfixit.<your-account>.workers.dev (the account name goes in the
// middle, and we don't know it yet). Update this once you have the real
// URL, or a custom domain, and see README step 6. A runtime script in
// Web3Fields.astro also fixes up the Web3Forms `redirect` field to the
// page's real origin on localhost/previews, so this value only matters
// for visitors with JavaScript disabled.
const SITE_URL = "https://dsfixit.workers.dev";

export default defineConfig({
  site: SITE_URL,
  trailingSlash: "always",
  env: {
    schema: {
      PUBLIC_WEB3FORMS_ACCESS_KEY: envField.string({
        context: "client",
        access: "public",
        optional: true,
      }),
    },
  },
});
