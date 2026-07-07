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
