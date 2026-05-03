# LKNZMZD.XYZ V2.5 — Signals Backend Layer

V2.5 upgrades the V2.4 Signals Layer from a static subscription surface into a real backend-ready system.

## What V2.5 adds

- `subscribe.html` now posts to `https://signals.lknzmzd.xyz/subscribe`.
- Cloudflare Worker API template in `/backend`.
- Supabase subscriber schema and event log.
- Honeypot bot check.
- CORS allowlist for `lknzmzd.xyz` and `www.lknzmzd.xyz`.
- Optional Cloudflare Turnstile verification support.
- Optional IP hashing support without storing raw IP addresses.
- `/health` endpoint for backend verification.
- Frontend fallback still exists if the Worker is not deployed yet.

## Static deployment

Upload all root files directly to the `lknzmzd-xyz` GitHub repo root:

```text
index.html
style.css
main.js
systems.json
updates.json
subscribe.html
updates.html
status.html
division.html
privacy.html
backend/
```

Do not upload the ZIP as a nested folder.

## Backend deployment

Read:

```text
/backend/README.md
```

Fast path:

1. Run `/backend/supabase-signals-subscribers.sql` in Supabase SQL Editor.
2. Deploy `/backend/worker-subscribe-template.js` as a Cloudflare Worker.
3. Set Worker secrets:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `IP_HASH_SECRET`
4. Bind Worker custom domain:

```text
signals.lknzmzd.xyz
```

5. Test:

```text
https://signals.lknzmzd.xyz/health
```

## Current endpoint

The subscription form uses:

```text
https://signals.lknzmzd.xyz/subscribe
```

You can change this in `subscribe.html`:

```html
<meta name="signals-endpoint" content="https://signals.lknzmzd.xyz/subscribe" />
```

## Version

`LKNZMZD.XYZ / V2.5.0`
