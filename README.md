# Community Node — BBS/Terminal Website

Static prototype for a community workshop + repair desk.

## Run locally

Open `index.html` in a local web server so `data/workshops.json` can load:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy

1. Create a GitHub repository.
2. Copy these files into the repository.
3. Push to the `main` branch.
4. In GitHub: Settings → Pages → Source: GitHub Actions.
5. The workflow in `.github/workflows/pages.yml` will deploy the site.

## Before launch

Replace the demo workshop signup action and repair form with a real form/booking service. Do not put private credentials or API secrets into this static repository.
