# Breeana Bellflower's site

Personal portfolio, hosted with GitHub Pages from `main` at the repository root.

## Editing

- `index.html`: content and browser JavaScript, including the theme and menu.
- `_astro/*.css`: all styling, responsive layout, and theme colors.
- `images/`, `fonts/`, `favicon.svg`, and `og.png`: public assets.
- `404.html`: custom error page.
- `education/transformers.html`: standalone Inside a Transformer walkthrough, linked at `/education/transformers`. Its original HTML, styling, and interactive JavaScript are preserved; it loads Geist fonts from Google Fonts.

This repository contains the complete static Astro export from the active server
deployment, preserving its original green-and-orange design. The original Astro
component source was not present in the deployed folder. No build or dependency
installation is needed; edit the HTML/CSS directly.
Pushes to `main` trigger GitHub Pages publication. GitHub Pages hosts static files;
any future server-side features will need a separate service.

## Domain migration

The live custom domain is `breeanabellflower.com`, with HTTPS enforced. DNS is
managed in Cloudflare; the apex and www already point to GitHub Pages. The
website uses root-relative asset paths to preserve the active deployment exactly.
The GitHub Pages project URL redirects to the custom domain.

In Settings > Pages, add the custom domain before changing DNS. Replace conflicting
website records with:

| Type | Name | Value |
| --- | --- | --- |
| A | @ | 185.199.108.153 |
| A | @ | 185.199.109.153 |
| A | @ | 185.199.110.153 |
| A | @ | 185.199.111.153 |
| CNAME | www | breeanabellflower.github.io |

Use DNS-only records in Cloudflare for the initial migration and certificate
issuance. Preserve mail records and unrelated subdomains. Remove conflicting
website AAAA records or replace them with the GitHub Pages IPv6 addresses listed
in the official documentation. Enable Enforce HTTPS after the certificate is ready.

GitHub recommends verifying domain ownership in account Settings > Pages using
its generated TXT record. Do this before switching DNS where possible.

Reference: https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site/managing-a-custom-domain-for-your-github-pages-site

## Public content boundary

Only website content and public assets belong here. Server binaries, machine
configuration, credentials, environment files, and private operational logs are
excluded. The contact email and public profile links already displayed on the
portfolio remain intentional public content. Review screenshots and every new
file for sensitive information before committing.
