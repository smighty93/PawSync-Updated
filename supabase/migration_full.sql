-- ====================================================
-- PawSync Full Migration — Run in Supabase SQL Editor
-- Idempotent: safe to run multiple times
-- ====================================================

-- ────────────────────────────────────────────────────
-- 1. ENHANCE PETS TABLE
-- ────────────────────────────────────────────────────
alter table public.pets
  add column if not exists photo_url          text,
  add column if not exists vaccination_status text default 'unknown'
    check (vaccination_status in
      ('fully_vaccinated','partially_vaccinated','not_vaccinated','unknown')),
  add column if not exists is_neutered        boolean default false,
  add column if not exists allergies          text,
  add column if not exists medical_conditions text,
  add column if not exists microchip_id       text,
  add column if not exists special_notes      text;

-- ────────────────────────────────────────────────────
-- 2. ENHANCE MEDICAL RECORDS TABLE
-- ────────────────────────────────────────────────────
alter table public.medical_records
  add column if not exists veterinarian_name       text,
  add column if not exists record_type             text default 'consultation'
    check (record_type in
      ('consultation','vaccination','prescription','follow_up','surgery','other')),
  add column if not exists symptoms                text,
  add column if not exists prescription            text,
  add column if not exists medication_instructions text,
  add column if not exists follow_up_date          date,
  add column if not exists document_url            text;

-- ────────────────────────────────────────────────────
-- 3. PET WEIGHTS TABLE (idempotent)
-- ────────────────────────────────────────────────────
create table if not exists public.pet_weights (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references public.pets(id) on delete cascade,
  weight_kg   numeric(6,2) not null,
  recorded_at date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now()
);
alter table public.pet_weights enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where tablename='pet_weights' and policyname='Owners can view their pet weights') then
    execute 'create policy "Owners can view their pet weights" on public.pet_weights for select to authenticated using (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
  if not exists (select 1 from pg_policies where tablename='pet_weights' and policyname='Owners can insert pet weights') then
    execute 'create policy "Owners can insert pet weights" on public.pet_weights for insert to authenticated with check (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
  if not exists (select 1 from pg_policies where tablename='pet_weights' and policyname='Owners can update their pet weights') then
    execute 'create policy "Owners can update their pet weights" on public.pet_weights for update to authenticated using (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
  if not exists (select 1 from pg_policies where tablename='pet_weights' and policyname='Owners can delete their pet weights') then
    execute 'create policy "Owners can delete their pet weights" on public.pet_weights for delete to authenticated using (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 4. REMINDERS TABLE (idempotent)
-- ────────────────────────────────────────────────────
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
  if not exists (select 1 from pg_policies where tablename='reminders' and policyname='Owners can view their own reminders') then
    execute 'create policy "Owners can view their own reminders" on public.reminders for select to authenticated using (owner_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where tablename='reminders' and policyname='Owners can insert their own reminders') then
    execute 'create policy "Owners can insert their own reminders" on public.reminders for insert to authenticated with check (owner_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where tablename='reminders' and policyname='Owners can update their own reminders') then
    execute 'create policy "Owners can update their own reminders" on public.reminders for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where tablename='reminders' and policyname='Owners can delete their own reminders') then
    execute 'create policy "Owners can delete their own reminders" on public.reminders for delete to authenticated using (owner_id = auth.uid())';
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 5. STORAGE BUCKETS
-- Run from Supabase Dashboard → Storage → New Bucket:
--   Bucket name:  pet-photos
--   Public:       YES (for pet photos shown in UI)
--   Bucket name:  medical-documents
--   Public:       NO  (private, use signed URLs)
--
-- After creating buckets, add these storage policies:
-- ────────────────────────────────────────────────────

-- pet-photos bucket policies (run after bucket is created):
-- insert into storage.buckets (id, name, public) values ('pet-photos', 'pet-photos', true) on conflict do nothing;
-- insert into storage.buckets (id, name, public) values ('medical-documents', 'medical-documents', false) on conflict do nothing;

-- Storage RLS for pet-photos
do $$ begin
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='Owners upload pet photos') then
    execute $pol$create policy "Owners upload pet photos" on storage.objects for insert to authenticated
      with check (bucket_id = 'pet-photos' and auth.uid()::text = (storage.foldername(name))[1])$pol$;
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='Public read pet photos') then
    execute $pol$create policy "Public read pet photos" on storage.objects for select to public
      using (bucket_id = 'pet-photos')$pol$;
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='Owners update pet photos') then
    execute $pol$create policy "Owners update pet photos" on storage.objects for update to authenticated
      using (bucket_id = 'pet-photos' and auth.uid()::text = (storage.foldername(name))[1])$pol$;
  end if;
  if not exists (select 1 from pg_policies where tablename='objects' and schemaname='storage' and policyname='Owners delete pet photos') then
    execute $pol$create policy "Owners delete pet photos" on storage.objects for delete to authenticated
      using (bucket_id = 'pet-photos' and auth.uid()::text = (storage.foldername(name))[1])$pol$;
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 6. FOUR DEMO PETS FOR hum133@gmail.com
-- ────────────────────────────────────────────────────
do $$
declare
  v_owner_id   uuid;
  v_bruno_id   uuid;
  v_bella_id   uuid;
  v_max_id     uuid;
  v_daisy_id   uuid;
begin
  select id into v_owner_id from auth.users where email = 'hum133@gmail.com';
  if v_owner_id is null then
    raise notice 'User hum133@gmail.com not found — skipping demo data';
    return;
  end if;

  raise notice 'Creating demo pets for owner %', v_owner_id;

  -- BRUNO
  insert into public.pets (
    owner_id, name, species, breed, gender, date_of_birth, weight,
    vaccination_status, is_neutered, allergies, medical_conditions,
    microchip_id, special_notes
  ) values (
    v_owner_id, 'Bruno', 'Dog', 'Labrador Retriever', 'Male', '2022-06-15', 28,
    'fully_vaccinated', true, null, null,
    'MC-DEMO-001', '[DEMO DATA] Demonstration profile. Not genuine veterinary history.'
  ) on conflict do nothing returning id into v_bruno_id;
  if v_bruno_id is null then
    select id into v_bruno_id from public.pets where owner_id = v_owner_id and name = 'Bruno';
  end if;

  -- BELLA
  insert into public.pets (
    owner_id, name, species, breed, gender, date_of_birth, weight,
    vaccination_status, is_neutered, allergies, medical_conditions,
    microchip_id, special_notes
  ) values (
    v_owner_id, 'Bella', 'Dog', 'Golden Retriever', 'Female', '2023-03-20', 24,
    'partially_vaccinated', false, null, null,
    'MC-DEMO-002', '[DEMO DATA] Demonstration profile. Not genuine veterinary history.'
  ) on conflict do nothing returning id into v_bella_id;
  if v_bella_id is null then
    select id into v_bella_id from public.pets where owner_id = v_owner_id and name = 'Bella';
  end if;

  -- MAX
  insert into public.pets (
    owner_id, name, species, breed, gender, date_of_birth, weight,
    vaccination_status, is_neutered, allergies, medical_conditions,
    microchip_id, special_notes
  ) values (
    v_owner_id, 'Max', 'Dog', 'German Shepherd', 'Male', '2021-09-12', 32,
    'fully_vaccinated', true,
    'Chicken-based proteins (mild)',
    'Mild hip dysplasia — monitored',
    'MC-DEMO-003', '[DEMO DATA] Demonstration profile. Not genuine veterinary history.'
  ) on conflict do nothing returning id into v_max_id;
  if v_max_id is null then
    select id into v_max_id from public.pets where owner_id = v_owner_id and name = 'Max';
  end if;

  -- DAISY
  insert into public.pets (
    owner_id, name, species, breed, gender, date_of_birth, weight,
    vaccination_status, is_neutered, allergies, medical_conditions,
    microchip_id, special_notes
  ) values (
    v_owner_id, 'Daisy', 'Dog', 'Beagle', 'Female', '2023-11-08', 12,
    'partially_vaccinated', false, null, null,
    'MC-DEMO-004', '[DEMO DATA] Demonstration profile. Not genuine veterinary history.'
  ) on conflict do nothing returning id into v_daisy_id;
  if v_daisy_id is null then
    select id into v_daisy_id from public.pets where owner_id = v_owner_id and name = 'Daisy';
  end if;

  -- Weight history
  insert into public.pet_weights (pet_id, weight_kg, recorded_at, notes) values
    (v_bruno_id, 24.5, '2024-01-10', '[DEMO]'), (v_bruno_id, 25.8, '2024-04-15', '[DEMO]'),
    (v_bruno_id, 26.9, '2024-07-20', '[DEMO]'), (v_bruno_id, 27.5, '2024-10-05', '[DEMO]'),
    (v_bruno_id, 28.0, '2025-01-12', '[DEMO]'), (v_bruno_id, 28.3, '2025-05-08', '[DEMO]'),
    (v_bella_id, 20.0, '2024-03-20', '[DEMO]'), (v_bella_id, 21.5, '2024-06-15', '[DEMO]'),
    (v_bella_id, 22.8, '2024-09-10', '[DEMO]'), (v_bella_id, 23.5, '2025-01-08', '[DEMO]'),
    (v_bella_id, 24.0, '2025-05-20', '[DEMO]'),
    (v_max_id,   29.0, '2023-09-12', '[DEMO]'), (v_max_id,   30.5, '2024-01-15', '[DEMO]'),
    (v_max_id,   31.2, '2024-06-20', '[DEMO]'), (v_max_id,   32.0, '2025-01-10', '[DEMO]'),
    (v_daisy_id, 9.5,  '2024-11-08', '[DEMO]'), (v_daisy_id, 10.8, '2025-01-15', '[DEMO]'),
    (v_daisy_id, 12.0, '2025-05-10', '[DEMO]')
  on conflict do nothing;

  -- Vaccinations
  insert into public.vaccinations (pet_id, vaccine_name, vaccination_date, next_due_date, notes) values
    (v_bruno_id, 'Rabies',               '2023-06-20', '2026-06-20', '[DEMO]'),
    (v_bruno_id, 'DHPP',                 '2023-06-20', '2024-06-20', '[DEMO]'),
    (v_bruno_id, 'Bordetella',           '2024-06-20', '2025-06-20', '[DEMO]'),
    (v_bruno_id, 'Leptospirosis',        '2024-06-20', '2025-06-20', '[DEMO]'),
    (v_bella_id, 'Rabies',               '2024-03-25', '2025-03-25', '[DEMO]'),
    (v_bella_id, 'DHPP',                 '2024-03-25', '2025-03-25', '[DEMO]'),
    (v_bella_id, 'Bordetella',           '2024-03-25', '2025-03-25', '[DEMO]'),
    (v_max_id,   'Rabies',               '2022-09-15', '2025-09-15', '[DEMO]'),
    (v_max_id,   'DHPP',                 '2022-09-15', '2023-09-15', '[DEMO]'),
    (v_max_id,   'DHPP Booster',         '2023-09-15', '2024-09-15', '[DEMO]'),
    (v_max_id,   'Bordetella',           '2024-09-15', '2025-09-15', '[DEMO]'),
    (v_max_id,   'Leptospirosis',        '2024-09-15', '2025-09-15', '[DEMO]'),
    (v_daisy_id, 'DHPP Puppy Series #1', '2024-01-10', null,         '[DEMO]'),
    (v_daisy_id, 'DHPP Puppy Series #2', '2024-02-07', null,         '[DEMO]'),
    (v_daisy_id, 'Rabies (first)',       '2024-03-05', '2025-03-05', '[DEMO]')
  on conflict do nothing;

  -- Medical records
  insert into public.medical_records (
    pet_id, record_date, record_type, veterinarian_name,
    diagnosis, treatment, symptoms, prescription,
    medication_instructions, follow_up_date, notes
  ) values
    (v_bruno_id,'2024-03-10','consultation','Dr. Sarah Mitchell',
     'Mild ear infection','Ear drops','Scratching, head shaking',
     'Otomax ear drops','4 drops left ear twice daily, 7 days','2024-03-17','[DEMO]'),
    (v_bruno_id,'2024-08-22','consultation','Dr. James Walker',
     'Annual wellness exam','Heartworm prevention continued',null,
     'Heartgard Plus','One chew monthly',null,'[DEMO]'),
    (v_bella_id,'2024-05-05','consultation','Dr. James Walker',
     'Puppy wellness check','Core vaccines given',null,null,null,'2024-08-05','[DEMO]'),
    (v_bella_id,'2024-11-18','consultation','Dr. Sarah Mitchell',
     'Mild gastroenteritis','Bland diet and probiotics','Vomiting, loose stool',
     'Metronidazole 250mg','Twice daily with food, 5 days','2024-11-25','[DEMO]'),
    (v_max_id,  '2024-04-15','consultation','Dr. James Walker',
     'Hip dysplasia monitoring','Joint supplement added','Occasional stiffness after rest',
     'Cosequin DS','Two chews daily, ongoing','2024-10-15','[DEMO]'),
    (v_daisy_id,'2025-02-10','consultation','Dr. Sarah Mitchell',
     'Puppy wellness, 3-month check','Dewormer, flea prevention',null,
     'Heartgard Plus (puppy)','One chew monthly',null,'[DEMO]')
  on conflict do nothing;

  -- Reminders
  insert into public.reminders (owner_id, pet_id, type, title, due_date, notes) values
    (v_owner_id, v_bruno_id, 'vaccination', 'Bordetella vaccination',    '2025-06-20', '[DEMO]'),
    (v_owner_id, v_bruno_id, 'vaccination', 'Leptospirosis vaccination', '2025-06-20', '[DEMO]'),
    (v_owner_id, v_bella_id, 'vaccination', 'Rabies booster',            '2025-03-25', '[DEMO]'),
    (v_owner_id, v_bella_id, 'vaccination', 'DHPP booster',              '2025-03-25', '[DEMO]'),
    (v_owner_id, v_max_id,   'vaccination', 'Rabies triennial',          '2025-09-15', '[DEMO]'),
    (v_owner_id, v_max_id,   'medication',  'Joint supplement refill',   '2025-12-01', '[DEMO]'),
    (v_owner_id, v_daisy_id, 'vaccination', 'Rabies booster',            '2025-03-05', '[DEMO]'),
    (v_owner_id, v_daisy_id, 'vaccination', 'DHPP annual',               '2025-03-10', '[DEMO]')
  on conflict (owner_id, pet_id, type, title, due_date) do nothing;

  raise notice 'Demo data created for hum133@gmail.com';
end $$;
