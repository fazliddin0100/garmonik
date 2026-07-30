alter table public.portal_user_profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists father_name text,
  add column if not exists age int,
  add column if not exists phone text;
