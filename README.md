# LKNZMZD.XYZ V2.3.1 — Systems Gateway

Static public gateway for the LKNZMZD ecosystem.

## What changed in V2

- Rebuilt the page from a link hub into a systems gateway.
- Added module-driven architecture using `systems.json`.
- Added command palette: `Ctrl+K`, `/`, or the top-right command button.
- Added module filtering by layer.
- Added `status.html` for public route/status overview.
- Upgraded `division.html` into a stronger system doctrine page.
- Removed the empty `Three.js` placeholder file.
- Removed runtime dependency on CDN Three.js; background now uses local canvas JS.
- Added missing PWA icons and OG image.
- Fixed sitemap to include all public pages.
- Set CNAME to apex domain: `lknzmzd.xyz`.

## Deploy

Upload all files in this folder to the root of the GitHub Pages repository or replace the existing repository contents.

If your GitHub Pages custom domain is configured as `www.lknzmzd.xyz`, change the `CNAME` file back to:

```txt
www.lknzmzd.xyz
```

Otherwise keep:

```txt
lknzmzd.xyz
```

## Main files

- `index.html` — systems gateway home
- `systems.json` — module data source
- `status.html` — route/status overview
- `division.html` — system doctrine
- `style.css` — full visual system
- `main.js` — canvas background, cards, filters, command palette

## V2.1 update

Restored the identity morph intro: `ILKIN AZIMZADE` compresses into `LKNZMZD` before the gateway loads. Add `?intro=1` to replay it in the same browser session.


## V2.3 intro cleanup

- Restored a clean full-screen identity morph layer.
- Suppressed background page content during boot to avoid visible text bleed.
- Added a subtle abstract boot atmosphere instead of showing underlying page words.


## V2.3 intro cleanup
- Removed the framed/square boot panel.
- Rebuilt the opening as a clean full-screen identity morph.
- Kept the ILKIN AZIMZADE → LKNZMZD transformation without background content bleed.
