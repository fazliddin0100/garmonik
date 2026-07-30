-- Plain PostgreSQL auth: portal foydalanuvchilari (Supabase Auth o‘rniga, bosqich 2+).

create table if not exists public.app_users (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  password_hash text not null,
  email_verified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists app_users_email_lower_idx
  on public.app_users (lower(email));

comment on table public.app_users is
  'Portal foydalanuvchilari (admin/xodim). Parol bcrypt hash.';

-- portal_user_profiles.user_id hozircha auth.users ga bog‘langan.
-- Bosqich 2: FK app_users ga o‘tkaziladi va login JWT orqali ishlaydi.
