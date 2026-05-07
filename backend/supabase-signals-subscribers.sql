-- LKNZMZD Signals V2.7 — Supabase subscriber + email sending backend
-- Safe to run multiple times in Supabase SQL Editor.
-- V2.7 adds campaign and delivery logs for Resend/Worker email sending.

create extension if not exists pgcrypto;

create table if not exists public.lknzmzd_signal_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  interests text[] not null default array['All Updates'],
  source text not null default 'lknzmzd.xyz',
  referrer text,
  user_agent text,
  ip_hash text,
  consent_version text not null default 'signals-v1',
  status text not null default 'active' check (status in ('active', 'unsubscribed', 'bounced', 'blocked')),
  unsubscribe_token text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

alter table public.lknzmzd_signal_subscribers
add column if not exists unsubscribe_token text;

alter table public.lknzmzd_signal_subscribers
add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.lknzmzd_signal_subscription_events (
  id uuid primary key default gen_random_uuid(),
  subscriber_id uuid references public.lknzmzd_signal_subscribers(id) on delete set null,
  email text not null,
  event_type text not null check (event_type in ('subscribe', 'resubscribe', 'unsubscribe', 'update', 'error')),
  source text not null default 'lknzmzd.xyz',
  ip_hash text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.lknzmzd_signal_email_campaigns (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  subject text not null,
  status text not null default 'draft' check (status in ('draft', 'test', 'sending', 'sent', 'failed', 'dry_run')),
  audience_status text not null default 'active',
  target_count integer not null default 0,
  sent_count integer not null default 0,
  failed_count integer not null default 0,
  dry_run boolean not null default true,
  created_by text not null default 'admin',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz
);

create table if not exists public.lknzmzd_signal_email_deliveries (
  id uuid primary key default gen_random_uuid(),
  campaign_id uuid references public.lknzmzd_signal_email_campaigns(id) on delete set null,
  subscriber_id uuid references public.lknzmzd_signal_subscribers(id) on delete set null,
  email text not null,
  provider text not null default 'resend',
  provider_message_id text,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'dry_run')),
  error text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  sent_at timestamptz
);

create index if not exists idx_lknzmzd_signal_subscribers_status
on public.lknzmzd_signal_subscribers(status);

create index if not exists idx_lknzmzd_signal_subscribers_created_at
on public.lknzmzd_signal_subscribers(created_at desc);

create unique index if not exists idx_lknzmzd_signal_subscribers_unsubscribe_token
on public.lknzmzd_signal_subscribers(unsubscribe_token)
where unsubscribe_token is not null;

create index if not exists idx_lknzmzd_signal_subscription_events_created_at
on public.lknzmzd_signal_subscription_events(created_at desc);

create index if not exists idx_lknzmzd_signal_email_campaigns_created_at
on public.lknzmzd_signal_email_campaigns(created_at desc);

create index if not exists idx_lknzmzd_signal_email_deliveries_campaign_id
on public.lknzmzd_signal_email_deliveries(campaign_id);

create index if not exists idx_lknzmzd_signal_email_deliveries_email
on public.lknzmzd_signal_email_deliveries(email);

create or replace function public.set_lknzmzd_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_lknzmzd_signal_subscribers_updated_at on public.lknzmzd_signal_subscribers;
create trigger trg_lknzmzd_signal_subscribers_updated_at
before update on public.lknzmzd_signal_subscribers
for each row execute function public.set_lknzmzd_updated_at();

drop trigger if exists trg_lknzmzd_signal_email_campaigns_updated_at on public.lknzmzd_signal_email_campaigns;
create trigger trg_lknzmzd_signal_email_campaigns_updated_at
before update on public.lknzmzd_signal_email_campaigns
for each row execute function public.set_lknzmzd_updated_at();

-- Backfill tokens for existing rows. These are used for email unsubscribe links.
update public.lknzmzd_signal_subscribers
set unsubscribe_token = encode(gen_random_bytes(24), 'hex')
where unsubscribe_token is null;

alter table public.lknzmzd_signal_subscribers enable row level security;
alter table public.lknzmzd_signal_subscription_events enable row level security;
alter table public.lknzmzd_signal_email_campaigns enable row level security;
alter table public.lknzmzd_signal_email_deliveries enable row level security;

-- No public RLS policies are created intentionally.
-- Browser clients should NOT write directly to these tables.
-- The Cloudflare Worker writes with SUPABASE_SERVICE_ROLE_KEY.

drop view if exists public.lknzmzd_active_signal_subscribers;

create view public.lknzmzd_active_signal_subscribers
with (security_invoker = true)
as
select
  email,
  interests,
  source,
  status,
  created_at,
  updated_at,
  subscribed_at
from public.lknzmzd_signal_subscribers
where status = 'active'
order by subscribed_at desc;
