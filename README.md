# d_sfixit

Community workshop + repair desk website. Built with [Astro](https://astro.build), hosted free on
Cloudflare, forms handled by [Web3Forms](https://web3forms.com) (also free).

## Local dev

1. Install [Node.js 24](https://nodejs.org) (the `.node-version` file pins this — tools like `nvm`
   or `fnm` will pick it up automatically).
2. `npm install` — this also sets up a Git hook that auto-formats and lints your changes when you
   commit, so you don't have to think about it.
3. `npm run dev` — opens the site at `http://localhost:4321` with live reload.

Forms won't actually send anywhere locally unless you've set a Web3Forms key — see below. Without
one, the site still builds and runs; the forms just show a "FORM OFFLINE" notice instead.

## Before you touch anything: check the site text

Open `src/config/site.ts`. That one file has the brand name, tagline, about text, location, contact
email, and — importantly — **`timeZone`**. Set `timeZone` to wherever the workshops actually happen
(e.g. `"America/Chicago"`); it's used to decide what "today" and "upcoming" mean. The default is
`"America/New_York"`.

## Adding a workshop

Open `src/data/workshops.json`. It's an array — copy one of the existing entries and change the
values. Fields:

| Field                   | Meaning                                                                                                                                                                                                                                                                                                                                                                                         |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                    | A short, unique, lowercase, hyphenated slug, e.g. `"basic-soldering"`. This becomes part of the URL (`/workshops/basic-soldering/`). **Must be unique** — if you copy-paste an entry as a template for a new workshop, don't forget to change this. Two entries with the same `id` won't fail the build; one of them will just silently disappear from the site, so double-check after copying. |
| `title`                 | Shown everywhere as-is.                                                                                                                                                                                                                                                                                                                                                                         |
| `date`                  | `YYYY-MM-DD`, e.g. `"2026-09-19"`.                                                                                                                                                                                                                                                                                                                                                              |
| `startTime` / `endTime` | 24-hour `HH:MM`, e.g. `"14:00"` and `"16:00"`.                                                                                                                                                                                                                                                                                                                                                  |
| `location`              | Free text.                                                                                                                                                                                                                                                                                                                                                                                      |
| `capacity`              | A number, shown on the page. **This is informational only** — the site doesn't count signups automatically (see "Marking a workshop full" below and the V2 roadmap).                                                                                                                                                                                                                            |
| `status`                | `"open"`, `"full"`, or `"cancelled"`.                                                                                                                                                                                                                                                                                                                                                           |
| `description`           | A sentence or two.                                                                                                                                                                                                                                                                                                                                                                              |

Save, commit, push — Cloudflare rebuilds the live site automatically within a minute or two.

A workshop disappears from the "upcoming" list once its date has passed — but only the next time the
site rebuilds. If nobody pushes anything for a while, push an empty commit or use Cloudflare's
dashboard to trigger a manual redeploy to refresh the list.

## Marking a workshop full or cancelled

There's no live signup count in V1 — you'll know it's full because you're getting sign-up emails.
When it is, change that workshop's `"status"` in `workshops.json` to `"full"` (or `"cancelled"` if
it's not happening), commit, and push. The signup form on that workshop's page is replaced with a
notice automatically.

## Setting up the Web3Forms key

1. Go to [web3forms.com](https://web3forms.com) and get a free access key (just an email address,
   no account needed).
2. **Locally:** copy `.env.example` to `.env` and paste the key in.
3. **On the live site:** add it as a build environment variable in the Cloudflare dashboard (see
   below) — never commit the real key to `.env`, since that file is git-ignored on purpose. (The key
   itself isn't a secret in the security sense — it's embedded in the page's HTML by design — but
   keeping it out of the repo means you can rotate it without a code change.)

Free tier is 250 form submissions a month combined across both forms, which comfortably covers a
small community site. If you ever outgrow it, Web3Forms has paid tiers, or see the V2 roadmap below.

## Connecting the repo to Cloudflare

1. Create a free Cloudflare account (no credit card required).
2. Dashboard → Workers & Pages → Create → Import a repository → pick this repo, authorize
   Cloudflare's GitHub app.
3. Build command: `npm run build`. Deploy command: leave as suggested (Cloudflare reads
   `wrangler.jsonc` for the rest).
4. Add two build environment variables: `NODE_VERSION` = `24`, and
   `PUBLIC_WEB3FORMS_ACCESS_KEY` = your real key from above.
5. Deploy. You'll get a free `https://<project-name>.<your-account>.workers.dev` URL. (The
   project name Cloudflare uses comes from what you name the project when importing it in the
   dashboard — it doesn't have to match `wrangler.jsonc`.)
6. Open `astro.config.mjs` and change `SITE_URL` to that real URL, then commit and push. (Until you
   do this, forms still work — a small script fixes the redirect at runtime — but it's worth
   tidying up so build-time links are correct too.)

Every pull request also gets its own preview URL automatically, so you can see a change live before
merging it into `main`.

## Custom domain (optional, still free)

Buy a domain anywhere (Cloudflare Registrar sells at cost, no markup, ~$10/year for a `.com`). Point
its DNS at Cloudflare, then in the Workers & Pages project settings, add it as a custom domain.
Cloudflare issues the certificate automatically.

## What's deliberately not here (V2 roadmap)

This is a "V1": no backend code, no database. It ships fast and costs nothing, at the price of
manual capacity tracking. If that becomes annoying, the natural next step ("V2") is:

- Add a Cloudflare Worker + D1 (a small free SQLite database) to this same project.
- Point `FORM_ENDPOINTS` in `src/config/forms.ts` at the new Worker routes instead of Web3Forms.
- The Worker checks each workshop's real signup count against its `capacity` and rejects
  over-capacity signups server-side, instead of relying on someone noticing and flipping `status`.

Because the form field names were chosen to match what that Worker would expect, this upgrade is a
change to `forms.ts` and a new Worker file — not a rewrite of the site.
