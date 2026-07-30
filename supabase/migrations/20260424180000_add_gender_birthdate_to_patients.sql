alter table public.patients
  add column if not exists gender text,
  add column if not exists birth_date date;
