-- Garmonik: MongoDB o‘rniga Supabase (PostgreSQL)
-- Supabase SQL Editor yoki CLI bilan qo‘llang.

create table if not exists public.clinics (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_file_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.clinic_json_resources (
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  key text not null,
  payload jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (clinic_id, key)
);

create table if not exists public.portal_user_profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  account_kind text not null check (account_kind in ('admin', 'staff')),
  auth_email text not null,
  admin_route_group text,
  staff_role text,
  display_name text not null default '',
  role_label text,
  staff_login text,
  legacy_external_id text unique,
  department text not null default '',
  is_active boolean not null default true,
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists portal_user_profiles_auth_email_lower
  on public.portal_user_profiles (lower(auth_email));

create index if not exists portal_user_profiles_staff_login_lower
  on public.portal_user_profiles (lower(staff_login));

create index if not exists portal_user_profiles_clinic_id on public.portal_user_profiles (clinic_id);
create index if not exists portal_user_profiles_account_kind on public.portal_user_profiles (account_kind);

create table if not exists public.blocked_ips (
  id uuid primary key default gen_random_uuid(),
  ip text not null unique,
  reason text not null default '',
  created_by_user_id uuid,
  created_by_login text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists blocked_ips_created_at on public.blocked_ips (created_at desc);

create table if not exists public.security_event_logs (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  actor_kind text not null,
  actor_id text,
  actor_login text,
  actor_role text,
  route_group text,
  target text,
  ip text,
  user_agent text,
  meta jsonb,
  created_at timestamptz not null default now()
);

create index if not exists security_event_logs_created_at on public.security_event_logs (created_at desc);
create index if not exists security_event_logs_event_type on public.security_event_logs (event_type);

create table if not exists public.access_audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_kind text not null,
  actor_id text,
  actor_login text,
  actor_role text,
  route_group text,
  resource_key text not null,
  method text not null,
  pathname text not null,
  ip text,
  user_agent text,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists access_audit_logs_created_at on public.access_audit_logs (created_at desc);

create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  login_norm text not null,
  code text not null,
  account_kind text not null check (account_kind in ('admin', 'staff')),
  expires_at timestamptz not null
);

create index if not exists password_reset_tokens_login_norm on public.password_reset_tokens (login_norm);
create index if not exists password_reset_tokens_expires on public.password_reset_tokens (expires_at);

create table if not exists public.clinic_staff_registrations (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  login text not null unique,
  password_hash text not null,
  name text not null,
  f_name text not null,
  s_name text not null,
  department text not null,
  phone text not null,
  gender text,
  age int not null default 18,
  role_name text not null,
  role_label text not null,
  created_at timestamptz not null default now()
);

alter table public.portal_user_profiles enable row level security;

create policy "portal_profiles_select_own"
  on public.portal_user_profiles for select
  using (auth.uid() = user_id);

create policy "portal_profiles_update_own"
  on public.portal_user_profiles for update
  using (auth.uid() = user_id);

alter table public.clinics enable row level security;
alter table public.clinic_json_resources enable row level security;
alter table public.blocked_ips enable row level security;
alter table public.security_event_logs enable row level security;
alter table public.access_audit_logs enable row level security;
alter table public.password_reset_tokens enable row level security;
alter table public.clinic_staff_registrations enable row level security;
