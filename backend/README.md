# LKNZMZD Signals V2.5 Backend

This backend turns the static `subscribe.html` form into a real subscriber intake system.

Architecture:

```text
lknzmzd.xyz/subscribe.html
  → https://signals.lknzmzd.xyz/subscribe
  → Cloudflare Worker
  → Supabase REST API
  → lknzmzd_signal_subscribers
  → lknzmzd_signal_subscription_events
```

## 1. Create Supabase tables

Open Supabase → SQL Editor → run:

```text
backend/supabase-signals-subscribers.sql
```

The schema enables RLS and intentionally creates no public write policies. The browser never writes directly to Supabase. Only the Worker uses the service role key.

## 2. Deploy the Worker

Install Wrangler if needed:

```powershell
npm install -g wrangler
wrangler login
```

From the `backend` folder:

```powershell
copy wrangler.toml.example wrangler.toml
wrangler secret put SUPABASE_URL
wrangler secret put SUPABASE_SERVICE_ROLE_KEY
wrangler secret put IP_HASH_SECRET
wrangler deploy
```

Use values:

```text
SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your Supabase service_role key
IP_HASH_SECRET=any long random private string
```

Do not put the Supabase service role key into frontend files, GitHub, or `.env` files that are committed.

## 3. Bind custom domain

In Cloudflare:

```text
Workers & Pages → lknzmzd-signals-worker → Settings → Domains & Routes → Add Custom Domain
```

Use:

```text
signals.lknzmzd.xyz
```

The frontend is already wired to:

```text
https://signals.lknzmzd.xyz/subscribe
```

Health check:

```powershell
curl https://signals.lknzmzd.xyz/health
```

Expected:

```json
{"ok":true,"service":"lknzmzd-signals-worker","version":"2.5.0"}
```

## 4. Test subscription endpoint

PowerShell:

```powershell
$body = @{
  email = "test@example.com"
  interests = @("All Updates", "Robotics")
  source = "manual-test"
  consent_version = "signals-v1"
} | ConvertTo-Json

Invoke-RestMethod `
  -Uri "https://signals.lknzmzd.xyz/subscribe" `
  -Method POST `
  -ContentType "application/json" `
  -Headers @{ Origin = "https://lknzmzd.xyz" } `
  -Body $body
```

Expected:

```json
{"ok":true,"status":"active",...}
```

Then check Supabase table:

```sql
select * from public.lknzmzd_signal_subscribers order by created_at desc;
select * from public.lknzmzd_signal_subscription_events order by created_at desc;
```

## 5. Optional Turnstile protection

The Worker supports Turnstile but the frontend does not render a widget yet. Do not set `TURNSTILE_SECRET_KEY` until you add a Turnstile widget to the form.

When ready:

```powershell
wrangler secret put TURNSTILE_SECRET_KEY
```

Then add Turnstile token submission to `subscribe.html` / `main.js`.

## Brutal rule

If `/health` works but `/subscribe` fails, the Worker exists but Supabase credentials or SQL schema are wrong.

If `/health` does not work, the Worker/custom domain route is wrong.
