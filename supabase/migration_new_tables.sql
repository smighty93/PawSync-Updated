-- Run this in Supabase SQL Editor (Dashboard > SQL Editor > New Query)

-- =====================================================
-- PET WEIGHTS TABLE
-- =====================================================

create table if not exists public.pet_weights (
  id uuid primary key default gen_random_uuid(),
  pet_id uuid not null references public.pets(id) on delete cascade,
  weight_kg numeric(6,2) not null,
  recorded_at date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

alter table public.pet_weights enable row level security;

create policy "Owners can view their pet weights"
on public.pet_weights for select to authenticated
using (pet_id in (select id from public.pets where owner_id = auth.uid()));

create policy "Owners can insert pet weights"
on public.pet_weights for insert to authenticated
with check (pet_id in (select id from public.pets where owner_id = auth.uid()));

create policy "Owners can update their pet weights"
on public.pet_weights for update to authenticated
using (pet_id in (select id from public.pets where owner_id = auth.uid()));

create policy "Owners can delete their pet weights"
on public.pet_weights for delete to authenticated
using (pet_id in (select id from public.pets where owner_id = auth.uid()));

-- =====================================================
-- REMINDERS TABLE
-- =====================================================

create table if not exists public.reminders (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  pet_id uuid references public.pets(id) on delete cascade,
  type text not null check (type in ('vaccination', 'medication', 'appointment')),
  title text not null,
  due_date date not null,
  status text not null default 'pending' check (status in ('pending', 'completed')),
  source_id uuid,
  notes text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_id, pet_id, type, title, due_date)
);

alter table public.reminders enable row level security;

create policy "Owners can view their own reminders"
on public.reminders for select to authenticated
using (owner_id = auth.uid());

create policy "Owners can insert their own reminders"
on public.reminders for insert to authenticated
with check (owner_id = auth.uid());

create policy "Owners can update their own reminders"
on public.reminders for update to authenticated
using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "Owners can delete their own reminders"
on public.reminders for delete to authenticated
using (owner_id = auth.uid());
