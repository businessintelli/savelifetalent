# Save Life Talent — website

AI-assisted healthcare staffing site for **savelifetalent.com**. Plain HTML/CSS/JS, no build step needed to host.

## What's here

| Path | What it is |
|---|---|
| `index.html`, `facilities.html`, `clinicians.html`, `jobs.html`, `how-our-ai-works.html`, `contact.html`, `thank-you.html`, `privacy.html`, `404.html` | The live site |
| `assets/` | Styles, scripts, favicon |
| `CNAME`, `robots.txt`, `sitemap.xml` | Domain + SEO files |
| `_source/` | Editable source: page content (`pages/`), header/footer (`partials/`), contact details (`site.config.json`) and the WordPress theme files (`wp/`) |

## Before launch — fill in your details

Edit `_source/site.config.json` (phone, address, city, hours, form email), then rebuild:

```bash
cd _source
python3 build.py
cp -r dist/static/. ..      # refresh the live files at repo root
```

`build.py` also writes the WordPress theme to `_source/dist/wordpress/savelifetalent`.

## Deploy

**GitHub Pages**
1. `git remote add origin https://github.com/<you>/savelifetalent-site.git && git push -u origin main`
2. Repo → Settings → Pages → Deploy from branch → `main` / root.
3. At your DNS provider, point `savelifetalent.com` to GitHub Pages (A records 185.199.108–111.153, `www` CNAME to `<you>.github.io`).

**Netlify / Vercel / Cloudflare Pages** — import the repo; no build command; publish directory is the repo root.

## Forms

Both forms post to [FormSubmit](https://formsubmit.co) using the form email in the config. The **first** submission triggers a one-time activation email to that inbox — click it, or nothing will be delivered. Submissions redirect to `thank-you.html`.

## AI features — what is real on the site

- **Shift match console** (homepage): an interactive demo with sample profiles, labelled as such.
- **Plain-language job search** (jobs page): parses queries like "night ICU per diem" into filters, client-side.
- **Request drafting** (contact page): fills a complete shift-request template.
- **Assistant** (every page): an automated FAQ helper that routes urgent needs to the phone desk. It is rule-based, not a live LLM. To connect a real LLM later, replace the `answer()` function in `assets/js/site.js` with a call to your own backend endpoint (never put an API key in the browser).

Review the copy on `how-our-ai-works.html` so it matches the tools your team actually uses.

## Editing jobs

Job cards are in `jobs.html` (or `_source/pages/jobs.html`). Each `<article class="job">` has `data-type` (Per Diem / Contract / Travel / Permanent) and `data-shift` (Days / Nights / Evenings / Flexible), which the search and filters use.
