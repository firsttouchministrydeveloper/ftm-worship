-- App role enum
create type app_role as enum ('PASTOR', 'WORSHIP_HEAD', 'WORSHIP_LEADER', 'MEMBER');

-- Users (linked 1:1 with auth.users)
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null default '',
  email text not null,
  avatar_url text,
  app_roles app_role[] not null default '{MEMBER}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index users_email_idx on public.users (lower(email));

-- Instrument roles lookup
create table public.instrument_roles (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  display_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Join: which instrument roles a user can play
create table public.user_instrument_roles (
  user_id uuid not null references public.users(id) on delete cascade,
  instrument_role_id uuid not null references public.instrument_roles(id) on delete cascade,
  primary key (user_id, instrument_role_id)
);

-- Service types (Sunday Service, TXT, Plug In, Teenagents, …)
create table public.service_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  recurring_day int not null check (recurring_day between 0 and 6), -- 0=Sun
  recurring_time time,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- Invites
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  name text,
  intended_app_roles app_role[] not null default '{MEMBER}',
  intended_instrument_role_ids uuid[] not null default '{}',
  token text not null unique,
  invited_by uuid not null references public.users(id),
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  expires_at timestamptz not null
);
create index invites_email_idx on public.invites (lower(email)) where accepted_at is null;

-- Push subscriptions (devices)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  device_label text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Auto-update updated_at on public.users
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_set_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- Seed default service types
insert into public.service_types (name, recurring_day, recurring_time, notes) values
  ('Sunday Service', 0, '10:00', 'Morning'),
  ('TXT', 5, null, null),
  ('Plug In', 2, null, null),
  ('Teenagents', 0, '15:00', 'Afternoon (community)')
on conflict (name) do nothing;

-- Seed default instrument roles (no "Worship Leader" — that is an app role)
insert into public.instrument_roles (name, display_order) values
  ('Vocals 1', 10),
  ('Vocals 2', 20),
  ('Vocals 3', 30),
  ('Acoustic Guitar', 40),
  ('Electric Guitar', 50),
  ('Bass', 60),
  ('Keys', 70),
  ('Drums', 80),
  ('Sound', 90)
on conflict (name) do nothing;
