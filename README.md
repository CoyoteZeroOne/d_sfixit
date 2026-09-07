# d_sfixit

Community workshop + repair desk website. Astro, hosted free on Cloudflare, forms via
[Web3Forms](https://web3forms.com).

## Local dev

1. Install [Node.js 24](https://nodejs.org) (`.node-version` pins this).
2. `npm install` — also installs a pre-commit hook that formats and lints automatically.
3. `npm run dev` — `http://localhost:4321`, live reload.

Forms won't actually send anywhere locally unless you've set a Web3Forms key — see below. Without
one, the site still builds and runs; the forms just show a "FORM OFFLINE" notice instead.

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

## One-time setup (already done for this site)

Kept here for reference — a new Cloudflare account or a fresh clone would need all of this again.

- **Web3Forms**: free key from web3forms.com. Locally in `.env`; on Cloudflare as the
  `PUBLIC_WEB3FORMS_ACCESS_KEY` build variable.
- **Cloudflare**: Workers & Pages → Import a repository → build command `npm run build` → add
  `NODE_VERSION=24` and the Web3Forms key as build variables → deploy. Afterward, set `SITE_URL` in
  `astro.config.mjs` to the real URL Cloudflare assigns.
- **Custom domain** (optional, still free): buy one anywhere, point its DNS at Cloudflare, add it
  as a custom domain on the Workers project.

## V2 roadmap

This is a "V1": no backend code, no database. It ships fast and costs nothing, at the price of
manual capacity tracking. If that becomes annoying, the natural next step ("V2") is:

- Add a Cloudflare Worker + D1 (a small free SQLite database) to this same project.
- Point `FORM_ENDPOINTS` in `src/config/forms.ts` at the new Worker routes instead of Web3Forms.
- The Worker checks each workshop's real signup count against its `capacity` and rejects
  over-capacity signups server-side, instead of relying on someone noticing and flipping `status`.

Because the form field names were chosen to match what that Worker would expect, this upgrade is a
change to `forms.ts` and a new Worker file — not a rewrite of the site.
