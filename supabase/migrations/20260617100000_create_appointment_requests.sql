create table if not exists public.appointment_requests (
  id uuid primary key default gen_random_uuid(),
  clinic_id uuid not null references public.clinics (id) on delete cascade,
  queue_number text not null,
  first_name text not null,
  last_name text not null,
  phone text not null,
  address text not null default '',
  disease_type text not null default '',
  preferred_time text,
  status text not null default 'new'
    check (status in ('new', 'confirmed', 'received', 'cancelled')),
  patient_id uuid references public.patients (id) on delete set null,
  source text not null default 'instagram',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint appointment_requests_clinic_queue_unique unique (clinic_id, queue_number)
);

create index if not exists appointment_requests_clinic_status_created_idx
  on public.appointment_requests (clinic_id, status, created_at desc);

alter table public.appointment_requests enable row level security;

revoke all on public.appointment_requests from anon, authenticated;
