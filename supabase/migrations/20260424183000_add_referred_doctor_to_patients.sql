alter table public.patients
  add column if not exists referred_doctor_user_id uuid references auth.users (id) on delete set null;

create index if not exists patients_referred_doctor_user_id_idx
  on public.patients (referred_doctor_user_id)
  where referred_doctor_user_id is not null;
