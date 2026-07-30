-- portal_user_profiles va patients FK larini app_users ga o‘tkazish.

-- Mavjud profillar uchun app_users qatorlari (parol Supabase auth dan nusxalanadi yoki reset talab qilinadi)
insert into public.app_users (id, email, password_hash, email_verified_at)
select
  p.user_id,
  lower(p.auth_email),
  coalesce(
    nullif(
      (
        select u.encrypted_password
        from auth.users u
        where u.id = p.user_id
          and u.encrypted_password is not null
          and length(u.encrypted_password) > 10
      ),
      ''
    ),
    '$2a$12$MIGRATION.RESET.REQUIRED.PLACEHOLDER.NOT.A.VALID.HASH'
  ),
  now()
from public.portal_user_profiles p
where not exists (
  select 1 from public.app_users a where a.id = p.user_id
);

alter table public.portal_user_profiles
  drop constraint if exists portal_user_profiles_user_id_fkey;

alter table public.portal_user_profiles
  add constraint portal_user_profiles_user_id_fkey
  foreign key (user_id) references public.app_users (id) on delete cascade;

alter table public.patients
  drop constraint if exists patients_created_by_user_id_fkey;

alter table public.patients
  add constraint patients_created_by_user_id_fkey
  foreign key (created_by_user_id) references public.app_users (id) on delete set null;

alter table public.patients
  drop constraint if exists patients_referred_doctor_user_id_fkey;

alter table public.patients
  add constraint patients_referred_doctor_user_id_fkey
  foreign key (referred_doctor_user_id) references public.app_users (id) on delete set null;
