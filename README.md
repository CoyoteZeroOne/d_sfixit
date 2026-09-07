# d_sfixit

Community workshop + repair desk website. Astro, hosted free on Cloudflare, forms via
[Web3Forms](https://web3forms.com).

## Local dev

1. Install [Node.js 24](https://nodejs.org) (`.node-version` pins this).
2. `npm install` — also installs a pre-commit hook that formats and lints automatically.
3. `npm run dev` — `http://localhost:4321`, live reload.

Without a Web3Forms key in `.env`, forms show "FORM OFFLINE" instead of failing the build. Testing
photo uploads needs `npm run dev:worker` instead — runs the site and the Worker together, against a
local fake bucket, nothing real gets touched.

## Everyday edits

**Site text** (brand, tagline, about, contact email, time zone) — one file, `src/config/site.ts`.

**Workshops** — `src/data/workshops.json`, an array. Copy an entry and edit it:

| Field                   | Meaning                                                                                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | Unique lowercase slug, e.g. `basic-soldering` — becomes the URL. Duplicates silently drop one entry instead of failing the build, so double-check after copying. |
| `date`                  | `YYYY-MM-DD`                                                                                                                                                     |
| `startTime` / `endTime` | 24-hour `HH:MM`                                                                                                                                                  |
| `capacity`              | Shown on the page, informational only — nothing counts real signups yet.                                                                                         |
| `status`                | `open`, `full`, or `cancelled` — flip this by hand once a workshop fills up.                                                                                     |

Push to deploy. A workshop drops off "upcoming" once its date passes, but only at the next rebuild
— push an empty commit or use Cloudflare's dashboard to force one if nothing else has landed in a
while.

## Repair photo uploads

Up to 5 photos per repair request (JPEG/PNG/GIF/WEBP/HEIC, 8MB each). Web3Forms' free tier can't
handle attachments, so uploads go through a small Cloudflare Worker (`src/worker/`) that stores
them in a free R2 bucket and hands Web3Forms a link instead of a file. Uploaded photos are
reachable by anyone with the exact link (an unguessable random ID, nothing else gates access) —
fine for a photo of a broken toaster, worth knowing if that ever changes.

## One-time setup (already done for this site)

Kept here for reference — a new Cloudflare account or a fresh clone would need all of this again.

- **Web3Forms**: free key from web3forms.com. Locally in `.env`; on Cloudflare as the
  `PUBLIC_WEB3FORMS_ACCESS_KEY` build variable.
- **Cloudflare**: Workers & Pages → Import a repository → build command `npm run build` → add
  `NODE_VERSION=24` and the Web3Forms key as build variables → deploy. Afterward, set `SITE_URL` in
  `astro.config.mjs` to the real URL Cloudflare assigns.
- **R2 bucket for photos**: `npx wrangler r2 bucket create d-sfixit-repair-photos`, enable Public
  Access on it in the dashboard, put the resulting `pub-xxxxxxxx.r2.dev` URL into `wrangler.jsonc`
  as `R2_PUBLIC_URL_BASE`, then run `npm run types`.
- **Custom domain** (optional, still free): buy one anywhere, point its DNS at Cloudflare, add it
  as a custom domain on the Workers project.

## V2 roadmap

No database yet — a workshop fills up by someone flipping `status` by hand. If that gets old: add
a D1 database to the existing Worker, and point `FORM_ENDPOINTS` (`src/config/forms.ts`) at new
Worker routes instead of Web3Forms, which then reject over-capacity signups automatically. Form
field names already match what that Worker would expect, so it's an addition, not a rewrite.
