-- ====================================================
-- PawSync Enhancement Migration
-- Run this in Supabase SQL Editor
-- ====================================================

-- =====================================================
-- 1. ENHANCE PETS TABLE
-- =====================================================

alter table public.pets
  add column if not exists photo_url          text,
  add column if not exists vaccination_status text default 'unknown'
    check (vaccination_status in ('fully_vaccinated','partially_vaccinated','not_vaccinated','unknown')),
  add column if not exists is_neutered        boolean default false,
  add column if not exists allergies          text,
  add column if not exists medical_conditions text,
  add column if not exists microchip_id       text,
  add column if not exists special_notes      text;

-- =====================================================
-- 2. ENHANCE MEDICAL RECORDS TABLE
-- =====================================================

alter table public.medical_records
  add column if not exists veterinarian_name   text,
  add column if not exists record_type         text default 'consultation'
    check (record_type in ('consultation','vaccination','prescription','follow_up','surgery','other')),
  add column if not exists symptoms            text,
  add column if not exists prescription        text,
  add column if not exists medication_instructions text,
  add column if not exists follow_up_date      date,
  add column if not exists document_url        text;

-- =====================================================
-- 3. ENSURE pet_weights TABLE EXISTS
-- =====================================================

create table if not exists public.pet_weights (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references public.pets(id) on delete cascade,
  weight_kg   numeric(6,2) not null,
  recorded_at date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now()
);

alter table public.pet_weights enable row level security;

-- Drop and recreate policies idempotently
do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename='pet_weights' and policyname='Owners can view their pet weights'
  ) then
    execute 'create policy "Owners can view their pet weights"
      on public.pet_weights for select to authenticated
      using (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename='pet_weights' and policyname='Owners can insert pet weights'
  ) then
    execute 'create policy "Owners can insert pet weights"
      on public.pet_weights for insert to authenticated
      with check (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename='pet_weights' and policyname='Owners can update their pet weights'
  ) then
    execute 'create policy "Owners can update their pet weights"
      on public.pet_weights for update to authenticated
      using (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename='pet_weights' and policyname='Owners can delete their pet weights'
  ) then
    execute 'create policy "Owners can delete their pet weights"
      on public.pet_weights for delete to authenticated
      using (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
end $$;

-- =====================================================
-- 4. ENSURE reminders TABLE EXISTS
-- =====================================================

create table if not exists public.reminders (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  pet_id       uuid references public.pets(id) on delete cascade,
  type         text not null check (type in ('vaccination','medication','appointment')),
  title        text not null,
  due_date     date not null,
  status       text not null default 'pending' check (status in ('pending','completed')),
  source_id    uuid,
  notes        text,
  created_at   timestamptz not null default now(),
  completed_at timestamptz,
  unique (owner_id, pet_id, type, title, due_date)
);

alter table public.reminders enable row level security;

do $$ begin
  if not exists (
    select 1 from pg_policies
    where tablename='reminders' and policyname='Owners can view their own reminders'
  ) then
    execute 'create policy "Owners can view their own reminders"
      on public.reminders for select to authenticated using (owner_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename='reminders' and policyname='Owners can insert their own reminders'
  ) then
    execute 'create policy "Owners can insert their own reminders"
      on public.reminders for insert to authenticated with check (owner_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename='reminders' and policyname='Owners can update their own reminders'
  ) then
    execute 'create policy "Owners can update their own reminders"
      on public.reminders for update to authenticated
      using (owner_id = auth.uid()) with check (owner_id = auth.uid())';
  end if;
  if not exists (
    select 1 from pg_policies
    where tablename='reminders' and policyname='Owners can delete their own reminders'
  ) then
    execute 'create policy "Owners can delete their own reminders"
      on public.reminders for delete to authenticated using (owner_id = auth.uid())';
  end if;
end $$;

-- =====================================================
-- 5. TEST DATA FOR hum133@gmail.com
-- NOTE: Replace USER_ID_PLACEHOLDER with the actual
--       auth.users id for hum133@gmail.com before running.
--       Run: select id from auth.users where email='hum133@gmail.com';
-- =====================================================

do $$
declare
  v_owner_id   uuid;
  v_bruno_id   uuid;
  v_bella_id   uuid;
begin
  -- Get owner ID
  select id into v_owner_id from auth.users where email = 'hum133@gmail.com';
  if v_owner_id is null then
    raise notice 'User hum133@gmail.com not found - skipping test data';
    return;
  end if;

  -- ── Bruno ──────────────────────────────────────────
  insert into public.pets (
    owner_id, name, species, breed, gender,
    date_of_birth, weight,
    vaccination_status, is_neutered,
    allergies, medical_conditions, special_notes
  ) values (
    v_owner_id, 'Bruno', 'Dog', 'Labrador Retriever', 'Male',
    '2022-06-15', 28,
    'fully_vaccinated', true,
    null, null,
    '[DEMO] This is a demonstration pet profile created for feature testing.'
  )
  on conflict do nothing
  returning id into v_bruno_id;

  if v_bruno_id is null then
    select id into v_bruno_id from public.pets
    where owner_id = v_owner_id and name = 'Bruno';
  end if;

  -- ── Bella ──────────────────────────────────────────
  insert into public.pets (
    owner_id, name, species, breed, gender,
    date_of_birth, weight,
    vaccination_status, is_neutered,
    allergies, medical_conditions, special_notes
  ) values (
    v_owner_id, 'Bella', 'Dog', 'Golden Retriever', 'Female',
    '2023-03-20', 24,
    'partially_vaccinated', false,
    null, null,
    '[DEMO] This is a demonstration pet profile created for feature testing.'
  )
  on conflict do nothing
  returning id into v_bella_id;

  if v_bella_id is null then
    select id into v_bella_id from public.pets
    where owner_id = v_owner_id and name = 'Bella';
  end if;

  -- ── Bruno weight history ───────────────────────────
  insert into public.pet_weights (pet_id, weight_kg, recorded_at, notes) values
    (v_bruno_id, 24.5, '2024-01-10', '[DEMO] Initial weigh-in'),
    (v_bruno_id, 25.8, '2024-04-15', '[DEMO] Spring checkup'),
    (v_bruno_id, 26.9, '2024-07-20', '[DEMO] Summer checkup'),
    (v_bruno_id, 27.5, '2024-10-05', '[DEMO] Autumn checkup'),
    (v_bruno_id, 28.0, '2025-01-12', '[DEMO] Annual checkup'),
    (v_bruno_id, 28.3, '2025-05-08', '[DEMO] Spring checkup'),
    (v_bruno_id, 28.0, '2025-09-15', '[DEMO] Autumn checkup')
  on conflict do nothing;

  -- ── Bella weight history ───────────────────────────
  insert into public.pet_weights (pet_id, weight_kg, recorded_at, notes) values
    (v_bella_id, 20.0, '2024-03-20', '[DEMO] Initial weigh-in'),
    (v_bella_id, 21.5, '2024-06-15', '[DEMO] Summer checkup'),
    (v_bella_id, 22.8, '2024-09-10', '[DEMO] Autumn checkup'),
    (v_bella_id, 23.5, '2025-01-08', '[DEMO] Annual checkup'),
    (v_bella_id, 24.0, '2025-05-20', '[DEMO] Spring checkup')
  on conflict do nothing;

  -- ── Bruno vaccinations ─────────────────────────────
  insert into public.vaccinations (pet_id, vaccine_name, vaccination_date, next_due_date, notes) values
    (v_bruno_id, 'Rabies', '2023-06-20', '2026-06-20', '[DEMO] 3-year rabies vaccination'),
    (v_bruno_id, 'DHPP (Distemper/Parvo)', '2023-06-20', '2024-06-20', '[DEMO] Core vaccine'),
    (v_bruno_id, 'Bordetella', '2024-06-20', '2025-06-20', '[DEMO] Kennel cough prevention'),
    (v_bruno_id, 'Leptospirosis', '2024-06-20', '2025-06-20', '[DEMO] Annual booster')
  on conflict do nothing;

  -- ── Bella vaccinations ─────────────────────────────
  insert into public.vaccinations (pet_id, vaccine_name, vaccination_date, next_due_date, notes) values
    (v_bella_id, 'Rabies', '2024-03-25', '2025-03-25', '[DEMO] First rabies vaccination'),
    (v_bella_id, 'DHPP (Distemper/Parvo)', '2024-03-25', '2025-03-25', '[DEMO] Core vaccine - booster due'),
    (v_bella_id, 'Bordetella', '2024-03-25', '2025-03-25', '[DEMO] First Bordetella - booster pending')
  on conflict do nothing;

  -- ── Bruno medical records ──────────────────────────
  insert into public.medical_records (
    pet_id, record_date, record_type, veterinarian_name,
    diagnosis, treatment, symptoms, prescription,
    medication_instructions, follow_up_date, notes
  ) values
    (v_bruno_id, '2024-03-10', 'consultation', 'Dr. Sarah Mitchell',
     'Mild ear infection', 'Ear drops prescribed', 'Scratching at left ear, head shaking',
     'Otomax ear drops', 'Apply 4 drops to left ear twice daily for 7 days',
     '2024-03-17', '[DEMO] Resolved within 7 days'),
    (v_bruno_id, '2024-08-22', 'consultation', 'Dr. James Walker',
     'Annual wellness exam - healthy', 'Heartworm prevention continued', 'No symptoms, routine checkup',
     'Heartgard Plus (monthly)', 'Give one chew monthly, same day each month',
     null, '[DEMO] All vitals normal'),
    (v_bruno_id, '2025-02-14', 'consultation', 'Dr. Sarah Mitchell',
     'Skin allergy - environmental', 'Antihistamine course', 'Itching, mild rash on belly',
     'Benadryl 25mg', 'Give one tablet every 8 hours for 5 days',
     '2025-02-21', '[DEMO] Seasonal allergy, monitor spring/summer')
  on conflict do nothing;

  -- ── Bella medical records ──────────────────────────
  insert into public.medical_records (
    pet_id, record_date, record_type, veterinarian_name,
    diagnosis, treatment, symptoms, prescription,
    medication_instructions, follow_up_date, notes
  ) values
    (v_bella_id, '2024-05-05', 'consultation', 'Dr. James Walker',
     'Puppy wellness check - healthy', 'Core vaccines administered', 'No symptoms, routine checkup',
     null, null, '2024-08-05', '[DEMO] Growing well, weight on track'),
    (v_bella_id, '2024-11-18', 'consultation', 'Dr. Sarah Mitchell',
     'Mild gastroenteritis', 'Bland diet and probiotics', 'Vomiting, loose stool for 2 days',
     'Metronidazole 250mg', 'Give one tablet twice daily with food for 5 days',
     '2024-11-25', '[DEMO] Resolved after dietary change')
  on conflict do nothing;

  -- ── Reminders ─────────────────────────────────────
  insert into public.reminders (owner_id, pet_id, type, title, due_date, notes) values
    (v_owner_id, v_bruno_id, 'vaccination', 'Bordetella vaccination', '2025-06-20', '[DEMO] Annual booster due'),
    (v_owner_id, v_bruno_id, 'vaccination', 'Leptospirosis vaccination', '2025-06-20', '[DEMO] Annual booster due'),
    (v_owner_id, v_bruno_id, 'medication', 'Heartgard Plus monthly dose', '2025-12-01', '[DEMO] Monthly heartworm prevention'),
    (v_owner_id, v_bella_id, 'vaccination', 'Rabies vaccination', '2025-03-25', '[DEMO] Annual booster due'),
    (v_owner_id, v_bella_id, 'vaccination', 'DHPP (Distemper/Parvo) vaccination', '2025-03-25', '[DEMO] Annual booster due'),
    (v_owner_id, v_bella_id, 'vaccination', 'Bordetella vaccination', '2025-03-25', '[DEMO] Annual booster due')
  on conflict (owner_id, pet_id, type, title, due_date) do nothing;

  raise notice 'Test data inserted for hum133@gmail.com (owner_id: %)', v_owner_id;
end $$;
