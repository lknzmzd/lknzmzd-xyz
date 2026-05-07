# LKNZMZD.XYZ V2.7 — Email Sending Integration

V2.7 upgrades the working V2.6 subscriber control layer into a controlled email sending layer.

## What V2.7 adds

- Resend REST API integration for Cloudflare Workers.
- Test email endpoint and admin UI button.
- Controlled broadcast endpoint for active subscribers.
- `EMAIL_DRY_RUN` mode so you can test the pipeline without sending real email.
- Campaign logs in Supabase.
- Delivery logs in Supabase.
- Tokenized unsubscribe links included in every broadcast email.
- Optional welcome email after subscribe.
- Admin email status endpoint.
- Frontend `admin.html` email control panel.

## New Worker endpoints

```text
GET  /admin/email/status
POST /admin/email/test
POST /admin/email/broadcast
GET  /admin/campaigns
```

All admin endpoints require:

```text
Authorization: Bearer ADMIN_TOKEN
```

## Static deployment

Upload all root files directly to the `lknzmzd-xyz` GitHub repo root. Do not upload the ZIP as a nested folder.

Important root files:

```text
index.html
style.css
main.js
systems.json
updates.json
subscribe.html
unsubscribe.html
admin.html
updates.html
status.html
division.html
privacy.html
backend/
```

## Backend deployment/update

Read:

```text
/backend/README.md
```

Fast path after V2.6 is already working:

1. Run updated `/backend/supabase-signals-subscribers.sql` in Supabase SQL Editor.
2. Add Resend API key only after your sending domain is verified.
3. Keep `EMAIL_DRY_RUN=true` until test sends are proven.
4. Deploy the Worker.
5. Test `/admin/email/status`.
6. Test `/admin/email/test`.
7. Only then enable real sending and broadcast.

## Current production domains

```text
Frontend: https://lknzmzd.xyz
Backend:  https://signals.lknzmzd.xyz
```

## Brutal rule

Do not broadcast until these are proven:

```text
/admin/email/status works
/admin/email/test works
unsubscribe link works
Supabase campaign log appears
Supabase delivery log appears
```

## Version

`LKNZMZD.XYZ / V2.7.0`
