-- Plain PostgreSQL: Supabase auth schema stub (local / VPS Postgres uchun).
-- Supabase cloud loyihasida bu migratsiya deyarli hech narsa qilmaydi (schema allaqachon bor).

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'extensions') then
    create schema if not exists auth;

    create table if not exists auth.users (
      id uuid primary key default gen_random_uuid(),
      email text,
      encrypted_password text,
      email_confirmed_at timestamptz,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );

    create or replace function auth.uid()
    returns uuid
    language sql
    stable
    as $fn$
      select null::uuid;
    $fn$;
  end if;
end
$$;

do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin;
  end if;
end
$$;
