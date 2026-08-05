-- Plain PostgreSQL: Supabase auth schema stub (local / VPS Postgres uchun).
-- Supabase cloud loyihasida bu migratsiya deyarli hech narsa qilmaydi (schema allaqachon bor).
-- Rollar (anon, authenticated, service_role): scripts/deploy/postgres-stub-roles.sql (postgres superuser)

do $$
begin
  if not exists (select 1 from pg_namespace where nspname = 'auth') then
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
    begin
      create role anon nologin;
    exception
      when insufficient_privilege then
        raise notice 'anon roli yaratilmadi (CREATEROLE yo''q) — postgres-stub-roles.sql ni superuser bilan ishga tushiring';
    end;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    begin
      create role authenticated nologin;
    exception
      when insufficient_privilege then
        raise notice 'authenticated roli yaratilmadi — postgres-stub-roles.sql';
    end;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    begin
      create role service_role nologin;
    exception
      when insufficient_privilege then
        raise notice 'service_role roli yaratilmadi — postgres-stub-roles.sql';
    end;
  end if;
end
$$;
