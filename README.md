# LSST Live

Family-friendly astronomy outreach: a free Windows desktop app and social video channel that maps real telescope alerts (near-Earth objects, comets, sky transients) onto a live 3D solar-system view.

**Live site (GitHub Pages):** [https://cyberbob4269.github.io/lsst-live-site/](https://cyberbob4269.github.io/lsst-live-site/)

## Pages

| Page | Purpose |
|------|---------|
| [index.html](index.html) | Project overview |
| [terms.html](terms.html) | Terms of Service (TikTok app review) |
| [privacy.html](privacy.html) | Privacy Policy (TikTok app review) |
| [publish.html](publish.html) | Operator tool for TikTok Content Posting API |

## TikTok publishing (local bridge)

TikTok OAuth and video upload are **not** handled in this repository. The publish UI (`publish.html`, `publish.js`) and OAuth redirect page (`oauth-callback.html`) talk only to a **local bridge** on the operator’s machine (`http://127.0.0.1:8767`). API keys and tokens stay in that bridge’s `.env` on the PC — nothing sensitive is stored in this static site.

## Domain verification

`tiktokSm7aqA4RIdCcWojCQrQoWqbDQqqRMW1H.txt` is required for TikTok domain verification and must remain published at the site root.

## Disclaimer

LSST Live is citizen-science outreach. We are not affiliated with the National Science Foundation or the Vera C. Rubin Observatory.
