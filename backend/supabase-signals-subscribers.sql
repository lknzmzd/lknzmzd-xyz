-- LKNZMZD Signals V2.5 — Supabase subscriber backend
-- Run this in Supabase SQL Editor before deploying the Cloudflare Worker.

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
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  subscribed_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

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

create index if not exists idx_lknzmzd_signal_subscribers_status
on public.lknzmzd_signal_subscribers(status);

create index if not exists idx_lknzmzd_signal_subscribers_created_at
on public.lknzmzd_signal_subscribers(created_at desc);

create index if not exists idx_lknzmzd_signal_subscription_events_created_at
on public.lknzmzd_signal_subscription_events(created_at desc);

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

alter table public.lknzmzd_signal_subscribers enable row level security;
alter table public.lknzmzd_signal_subscription_events enable row level security;

-- No public RLS policies are created intentionally.
-- Browser clients should NOT write directly to these tables.
-- The Cloudflare Worker writes with SUPABASE_SERVICE_ROLE_KEY.

create or replace view public.lknzmzd_active_signal_subscribers as
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
