// @ts-check
import { defineConfig, envField } from "astro/config";

// The site's real Cloudflare Workers URL. If a custom domain gets added
// later, update this to match (see README). A runtime script in
// Web3Fields.astro also fixes up the Web3Forms `redirect` field to the
// page's real origin on localhost/previews, so this value only matters
// for visitors with JavaScript disabled.
const SITE_URL = "https://d-sfixit.drsabbot-f4b.workers.dev";

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
