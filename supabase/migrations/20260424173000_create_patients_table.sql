create table if not exists public.patients (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  card_number text not null,
  first_name text not null,
  last_name text not null,
  father_name text not null default '',
  full_name text not null,
  address text not null default '',
  phone text not null,
  disease_type text not null default '',
  age int,
  created_by_user_id uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint patients_clinic_card_number_unique unique (clinic_id, card_number)
);

create index if not exists patients_clinic_id_created_at_idx
  on public.patients (clinic_id, created_at desc);

alter table public.patients enable row level security;

revoke all on public.patients from anon, authenticated;
