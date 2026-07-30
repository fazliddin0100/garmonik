-- Prod hardening: multi-clinic isolation + strict RLS

create schema if not exists app;

create or replace function app.current_profile_clinic_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.clinic_id
  from public.portal_user_profiles p
  where p.user_id = auth.uid()
  limit 1
$$;

create or replace function app.current_account_kind()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.account_kind
  from public.portal_user_profiles p
  where p.user_id = auth.uid()
  limit 1
$$;

create or replace function app.current_admin_route_group()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select p.admin_route_group
  from public.portal_user_profiles p
  where p.user_id = auth.uid()
  limit 1
$$;

create or replace function app.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(app.current_account_kind() = 'admin', false)
$$;

create or replace function app.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    app.current_account_kind() = 'admin'
    and app.current_admin_route_group() = 'superadmin',
    false
  )
$$;

-- Add clinic scoping for security/audit/reset tables
alter table public.blocked_ips
  add column if not exists clinic_id uuid references public.clinics (id) on delete cascade;

alter table public.security_event_logs
  add column if not exists clinic_id uuid references public.clinics (id) on delete cascade;

alter table public.access_audit_logs
  add column if not exists clinic_id uuid references public.clinics (id) on delete cascade;

alter table public.password_reset_tokens
  add column if not exists clinic_id uuid references public.clinics (id) on delete cascade;

create index if not exists blocked_ips_clinic_id on public.blocked_ips (clinic_id);
create unique index if not exists blocked_ips_clinic_ip_unique on public.blocked_ips (clinic_id, ip);
create index if not exists security_event_logs_clinic_id on public.security_event_logs (clinic_id);
create index if not exists access_audit_logs_clinic_id on public.access_audit_logs (clinic_id);
create index if not exists password_reset_tokens_clinic_id on public.password_reset_tokens (clinic_id);

-- Backfill with oldest clinic for existing rows
with first_clinic as (
  select id from public.clinics order by created_at asc limit 1
)
update public.blocked_ips b
set clinic_id = f.id
from first_clinic f
where b.clinic_id is null;

with first_clinic as (
  select id from public.clinics order by created_at asc limit 1
)
update public.security_event_logs s
set clinic_id = f.id
from first_clinic f
where s.clinic_id is null;

with first_clinic as (
  select id from public.clinics order by created_at asc limit 1
)
update public.access_audit_logs a
set clinic_id = f.id
from first_clinic f
where a.clinic_id is null;

with first_clinic as (
  select id from public.clinics order by created_at asc limit 1
)
update public.password_reset_tokens p
set clinic_id = f.id
from first_clinic f
where p.clinic_id is null;

alter table public.blocked_ips alter column clinic_id set not null;
alter table public.security_event_logs alter column clinic_id set not null;
alter table public.access_audit_logs alter column clinic_id set not null;
alter table public.password_reset_tokens alter column clinic_id set not null;

-- Lock down grants
revoke all on public.clinics from anon, authenticated;
revoke all on public.clinic_json_resources from anon, authenticated;
revoke all on public.portal_user_profiles from anon;
revoke all on public.blocked_ips from anon, authenticated;
revoke all on public.security_event_logs from anon, authenticated;
revoke all on public.access_audit_logs from anon, authenticated;
revoke all on public.password_reset_tokens from anon, authenticated;
revoke all on public.clinic_staff_registrations from anon, authenticated;

grant select on public.portal_user_profiles to authenticated;

-- Reset policies
drop policy if exists "portal_profiles_select_own" on public.portal_user_profiles;
drop policy if exists "portal_profiles_update_own" on public.portal_user_profiles;

create policy portal_profiles_select_self
on public.portal_user_profiles
for select
to authenticated
using (user_id = auth.uid());

create policy portal_profiles_update_self
on public.portal_user_profiles
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy clinics_select_own_clinic
on public.clinics
for select
to authenticated
using (id = app.current_profile_clinic_id());

create policy clinics_update_admin_own_clinic
on public.clinics
for update
to authenticated
using (app.is_admin() and id = app.current_profile_clinic_id())
with check (app.is_admin() and id = app.current_profile_clinic_id());

create policy clinic_json_resources_rw_same_clinic
on public.clinic_json_resources
for all
to authenticated
using (clinic_id = app.current_profile_clinic_id())
with check (clinic_id = app.current_profile_clinic_id());

create policy blocked_ips_admin_same_clinic
on public.blocked_ips
for all
to authenticated
using (app.is_admin() and clinic_id = app.current_profile_clinic_id())
with check (app.is_admin() and clinic_id = app.current_profile_clinic_id());

create policy security_logs_admin_same_clinic
on public.security_event_logs
for select
to authenticated
using (app.is_admin() and clinic_id = app.current_profile_clinic_id());

create policy access_logs_admin_same_clinic
on public.access_audit_logs
for select
to authenticated
using (app.is_admin() and clinic_id = app.current_profile_clinic_id());

create policy password_reset_tokens_admin_same_clinic
on public.password_reset_tokens
for all
to authenticated
using (app.is_admin() and clinic_id = app.current_profile_clinic_id())
with check (app.is_admin() and clinic_id = app.current_profile_clinic_id());

create policy clinic_staff_registrations_admin_same_clinic
on public.clinic_staff_registrations
for all
to authenticated
using (app.is_admin() and clinic_id = app.current_profile_clinic_id())
with check (app.is_admin() and clinic_id = app.current_profile_clinic_id());

