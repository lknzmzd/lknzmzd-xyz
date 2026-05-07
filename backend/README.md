# LKNZMZD Signals V2.7 Backend — Email Sending Integration

V2.7 adds email sending on top of the V2.6 subscriber control layer.

Architecture:

```text
admin.html
  → https://signals.lknzmzd.xyz/admin/email/test or /admin/email/broadcast
  → Cloudflare Worker
  → Supabase subscriber table
  → Resend REST API
  → Supabase campaign + delivery logs
```

## Provider

This build uses **Resend** through its HTTPS REST API from the Cloudflare Worker.

Required only for real sending:

```text
RESEND_API_KEY
EMAIL_FROM
EMAIL_SENDING_ENABLED=true
EMAIL_DRY_RUN=false
```

Default behavior is intentionally safe:

```text
EMAIL_SENDING_ENABLED=false
EMAIL_DRY_RUN=true
```

That means the Worker logs campaigns/deliveries but does not send real emails until you explicitly enable it.

## 1. Run / update Supabase schema

Open Supabase → SQL Editor → run:

```text
backend/supabase-signals-subscribers.sql
```

The SQL is safe to run over your existing V2.6 tables. It adds:

```text
lknzmzd_signal_email_campaigns
lknzmzd_signal_email_deliveries
```

It also keeps:

```text
lknzmzd_signal_subscribers
lknzmzd_signal_subscription_events
lknzmzd_active_signal_subscribers
```

## 2. Configure Worker variables/secrets

If you already deployed V2.6, keep your existing secrets:

```powershell
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put IP_HASH_SECRET
wrangler secret put ADMIN_TOKEN
```

For V2.7, add your Resend key when ready:

```powershell
wrangler secret put RESEND_API_KEY
```

Recommended `wrangler.toml` vars:

```toml
[vars]
ALLOWED_ORIGINS = "https://lknzmzd.xyz,https://www.lknzmzd.xyz"
PUBLIC_SIGNALS_BASE = "https://signals.lknzmzd.xyz"
EMAIL_FROM = "LKNZMZD Signals <signals@lknzmzd.xyz>"
EMAIL_REPLY_TO = "ilkinazimzade@lknzmzd.com"
EMAIL_SENDING_ENABLED = "false"
EMAIL_DRY_RUN = "true"
SEND_WELCOME_EMAIL = "false"
```

Deploy:

```powershell
cd backend
wrangler deploy
```

## 3. Health check

```powershell
curl.exe -i https://signals.lknzmzd.xyz/health
```

Expected version:

```json
{"ok":true,"service":"lknzmzd-signals-worker","version":"2.7.0"}
```

## 4. Check email configuration

```powershell
$admin = "PASTE_ADMIN_TOKEN"
Invoke-RestMethod `
  -Uri "https://signals.lknzmzd.xyz/admin/email/status" `
  -Headers @{ Authorization = "Bearer $admin" }
```

Safe result before real sending:

```json
{
  "ok": true,
  "sending_enabled": false,
  "dry_run": true,
  "resend_configured": false
}
```

## 5. Dry-run test email

With `EMAIL_DRY_RUN=true`, this will not send a real email, but it should create a campaign and delivery log.

```powershell
$admin = "PASTE_ADMIN_TOKEN"
$body = @{
  to = "you@example.com"
  subject = "LKNZMZD Signals — V2.7 test"
  title = "Email control layer online"
  preheader = "This is a controlled test send from LKNZMZD Signals V2.7."
  body_text = "This is a test from the LKNZMZD Signals email control layer."
  cta_url = "https://lknzmzd.xyz/updates.html"
  cta_label = "Open Signals Feed"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://signals.lknzmzd.xyz/admin/email/test" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $admin" } `
  -Body $body
```

## 6. Enable real sending

Only after your Resend domain is verified and dry-run tests work:

1. Add `RESEND_API_KEY` as a Wrangler secret.
2. Set in `wrangler.toml`:

```toml
EMAIL_SENDING_ENABLED = "true"
EMAIL_DRY_RUN = "false"
```

3. Deploy:

```powershell
wrangler deploy
```

4. Send one test email only.

Do not broadcast until the test email reaches the inbox and the unsubscribe link works.

## 7. Broadcast command

Broadcast requires the exact confirmation phrase:

```text
SEND_LKNZMZD_SIGNAL
```

PowerShell example:

```powershell
$admin = "PASTE_ADMIN_TOKEN"
$body = @{
  subject = "LKNZMZD Signals — new update"
  title = "New system signal published"
  preheader = "A new LKNZMZD system update is live."
  body_text = "Write your real update here. Keep it specific and useful."
  cta_url = "https://lknzmzd.xyz/updates.html"
  cta_label = "Open Signals Feed"
  limit = 50
  confirm = "SEND_LKNZMZD_SIGNAL"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://signals.lknzmzd.xyz/admin/email/broadcast" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ Authorization = "Bearer $admin" } `
  -Body $body
```

## 8. Campaign logs

```powershell
$admin = "PASTE_ADMIN_TOKEN"
Invoke-RestMethod `
  -Uri "https://signals.lknzmzd.xyz/admin/campaigns" `
  -Headers @{ Authorization = "Bearer $admin" }
```

Supabase tables:

```sql
select * from public.lknzmzd_signal_email_campaigns order by created_at desc;
select * from public.lknzmzd_signal_email_deliveries order by created_at desc;
```

## Safety rule

V2.7 can send email. Treat it as production infrastructure:

```text
Test first.
Dry-run first.
Send to yourself first.
Never broadcast without checking unsubscribe.
```
