alter table public.patients
  add column if not exists jshshir text not null default '';

create index if not exists patients_jshshir_idx
  on public.patients (clinic_id, jshshir);
