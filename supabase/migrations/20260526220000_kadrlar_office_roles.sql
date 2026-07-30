-- Kadrlar orqali yaratiladigan office (moliya, kadrlar, marketing, IT va h.k.) profillari.
-- `staff_role` — faqat account_kind = 'staff' uchun; office rollar account_kind = 'admin' + role_label.

comment on column public.portal_user_profiles.staff_role is
  'Tibbiy xodim roli (shifokor, laboratory, nurse, …) — faqat account_kind = staff';

comment on column public.portal_user_profiles.role_label is
  'Administrator lavozimi (Buxgalter / moliya, Kadrlar bo‘limi, …) — account_kind = admin';

comment on column public.portal_user_profiles.legacy_external_id is
  'Kadrlar panelidagi tashqi id; office adminlar uchun ham ishlatiladi';

create index if not exists portal_user_profiles_kadrlar_admin_idx
  on public.portal_user_profiles (legacy_external_id)
  where account_kind = 'admin' and legacy_external_id is not null;
