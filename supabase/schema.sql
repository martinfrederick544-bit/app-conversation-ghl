-- Run this in the Supabase SQL editor before deploying.

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  ghl_conversation_id text not null,
  ghl_contact_id text,
  contact_name text,
  contact_phone text,
  contact_email text,
  channel text not null check (channel in ('sms', 'email', 'call', 'voicemail')),
  direction text not null check (direction in ('inbound', 'outbound')),
  body text,
  subject text,
  call_recording_url text,
  call_duration_seconds integer,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx on messages (ghl_conversation_id);
create index if not exists messages_created_at_idx on messages (created_at desc);

create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security: these tables are only ever touched by the server
-- (using the service role key), never directly from the browser, so RLS
-- stays enabled with no public policies.
alter table messages enable row level security;
alter table push_subscriptions enable row level security;

-- Watermark for the self-polling notification checker (/api/cron/poll).
-- One row per conversation, tracking the last message we already sent a
-- push notification for.
create table if not exists poll_state (
  conversation_id text primary key,
  notified_message_date text not null,
  updated_at timestamptz not null default now()
);
alter table poll_state enable row level security;

-- Atomic "claim" used by the poller: only the first caller to reach this
-- for a given (conversation, message) pair gets `true` back, even if
-- several invocations race each other — Postgres's row lock on the
-- conflicting update serializes them.
create or replace function claim_notification(p_conversation_id text, p_message_date text)
returns boolean
language plpgsql
security definer
as $$
declare
  changed boolean;
begin
  insert into poll_state (conversation_id, notified_message_date, updated_at)
  values (p_conversation_id, p_message_date, now())
  on conflict (conversation_id) do update
    set notified_message_date = excluded.notified_message_date,
        updated_at = now()
    where poll_state.notified_message_date is distinct from excluded.notified_message_date
  returning true into changed;

  return coalesce(changed, false);
end;
$$;

grant execute on function claim_notification(text, text) to service_role;
