# d_sfixit

Community workshop + repair desk website. Astro, hosted free on Cloudflare, forms via
[Web3Forms](https://web3forms.com), plus a small Worker for signup emails (see below).

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
- **Custom domain** (optional, costs money each year): buy one anywhere, point its DNS at
  Cloudflare, add it as a custom domain on the Workers project.

## Signup emails (not switched on yet)

`src/worker.ts` can take signups instead of Web3Forms: it emails the organizer, then emails the
person a receipt with a calendar link, via [Resend](https://resend.com). Signups keep going to Web3Forms
until step 4, so do that step last.

1. **Domain**: Resend only sends from a domain you've verified, so `workers.dev` won't do. Add the
   domain in Resend and create an API key.
2. **Turnstile** (Cloudflare's free bot check): add a Turnstile widget for the site's domain in the
   Cloudflare dashboard. It gives a site key and a secret key.
3. **Worker secrets** (Workers project settings, as secrets, not build variables):
   - `RESEND_API_KEY`
   - `EMAIL_FROM`, e.g. `Ds FIXIT <signups@yourdomain.com>`
   - `TURNSTILE_SECRET_KEY`
4. **Build variables** (next to the existing Web3Forms key):
   - `PUBLIC_TURNSTILE_SITE_KEY`
   - `PUBLIC_SIGNUP_VIA_WORKER=true`
5. Redeploy. The signup form now posts to `/api/signup` and shows the Turnstile check.

Locally: put the three secrets in `.dev.vars` and the build variables in `.env`, then `npm run
build && npx wrangler dev`. Turnstile's
[test keys](https://developers.cloudflare.com/turnstile/troubleshooting/testing/) work there.

## Next step: capacity

Capacity is still tracked by hand. To enforce it, add D1 (a small free SQLite database) to the
Worker and have it count signups per workshop and reject them past `capacity`, instead of relying on
someone noticing and flipping `status`.
