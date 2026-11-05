-- ====================================================
-- PawSync Full Migration v2 — Corrected & Idempotent
-- Safe to run multiple times in Supabase SQL Editor.
-- Run in one execution (all sections depend on order).
-- ====================================================

-- ────────────────────────────────────────────────────
-- 1. ENHANCE PETS TABLE
-- Adds new columns only if they don't already exist.
-- The check constraint on vaccination_status is
-- created without IF NOT EXISTS — Postgres ≥15 only
-- supports that; use a named constraint + try/catch.
-- ────────────────────────────────────────────────────

alter table public.pets
  add column if not exists photo_url          text,
  add column if not exists is_neutered        boolean default false,
  add column if not exists allergies          text,
  add column if not exists medical_conditions text,
  add column if not exists microchip_id       text,
  add column if not exists special_notes      text;

-- Add vaccination_status with constraint, idempotently
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='pets' and column_name='vaccination_status'
  ) then
    alter table public.pets
      add column vaccination_status text not null default 'unknown'
        check (vaccination_status in
          ('fully_vaccinated','partially_vaccinated','not_vaccinated','unknown'));
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 2. ENHANCE VACCINATIONS TABLE
-- Adds status column and a unique constraint to make
-- demo inserts idempotent.
-- ────────────────────────────────────────────────────

do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='vaccinations' and column_name='status'
  ) then
    alter table public.vaccinations
      add column status text not null default 'administered'
        check (status in ('administered','scheduled','overdue'));
  end if;
end $$;

-- Unique constraint for idempotent demo inserts
-- (also prevents accidental duplicate vaccination records)
do $$ begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'vaccinations_pet_id_vaccine_name_vaccination_date_key'
  ) then
    alter table public.vaccinations
      add constraint vaccinations_pet_id_vaccine_name_vaccination_date_key
        unique (pet_id, vaccine_name, vaccination_date);
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 3. ENHANCE MEDICAL RECORDS TABLE
-- Adds new columns. No unique constraint — multiple
-- real records can share the same date. Demo inserts
-- use where-not-exists guards instead.
-- ────────────────────────────────────────────────────

alter table public.medical_records
  add column if not exists veterinarian_name       text,
  add column if not exists record_type             text,
  add column if not exists symptoms                text,
  add column if not exists prescription            text,
  add column if not exists medication_instructions text,
  add column if not exists follow_up_date          date,
  add column if not exists document_url            text;

-- Add record_type constraint idempotently
do $$ begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='medical_records' and column_name='record_type'
      and column_default is not null
  ) then
    -- column exists (added above without default) — set default and constraint
    begin
      alter table public.medical_records
        alter column record_type set default 'consultation';
    exception when others then null;
    end;
  end if;
  -- Add check constraint only if not already present
  if not exists (
    select 1 from pg_constraint
    where conname = 'medical_records_record_type_check'
  ) then
    begin
      alter table public.medical_records
        add constraint medical_records_record_type_check
          check (record_type in
            ('consultation','vaccination','prescription','follow_up','surgery','other'));
    exception when others then null;
    end;
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 4. PET WEIGHTS TABLE
-- Adds unique(pet_id, recorded_at) so demo inserts
-- are idempotent and duplicate weights are prevented.
-- ────────────────────────────────────────────────────

create table if not exists public.pet_weights (
  id          uuid primary key default gen_random_uuid(),
  pet_id      uuid not null references public.pets(id) on delete cascade,
  weight_kg   numeric(6,2) not null,
  recorded_at date not null default current_date,
  notes       text,
  created_at  timestamptz not null default now(),
  unique (pet_id, recorded_at)   -- prevents duplicates; makes inserts idempotent
);

alter table public.pet_weights enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='pet_weights' and policyname='Owners can view their pet weights') then
    execute 'create policy "Owners can view their pet weights"
      on public.pet_weights for select to authenticated
      using (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
  if not exists (select 1 from pg_policies where tablename='pet_weights' and policyname='Owners can insert pet weights') then
    execute 'create policy "Owners can insert pet weights"
      on public.pet_weights for insert to authenticated
      with check (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
  if not exists (select 1 from pg_policies where tablename='pet_weights' and policyname='Owners can update their pet weights') then
    execute 'create policy "Owners can update their pet weights"
      on public.pet_weights for update to authenticated
      using (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
  if not exists (select 1 from pg_policies where tablename='pet_weights' and policyname='Owners can delete their pet weights') then
    execute 'create policy "Owners can delete their pet weights"
      on public.pet_weights for delete to authenticated
      using (pet_id in (select id from public.pets where owner_id = auth.uid()))';
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 5. REMINDERS TABLE
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
  unique (owner_id, pet_id, type, title, due_date)  -- prevents duplicates
);

alter table public.reminders enable row level security;

do $$ begin
  if not exists (select 1 from pg_policies where tablename='reminders' and policyname='Owners can view their own reminders') then
    execute 'create policy "Owners can view their own reminders"
      on public.reminders for select to authenticated using (owner_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where tablename='reminders' and policyname='Owners can insert their own reminders') then
    execute 'create policy "Owners can insert their own reminders"
      on public.reminders for insert to authenticated with check (owner_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where tablename='reminders' and policyname='Owners can update their own reminders') then
    execute 'create policy "Owners can update their own reminders"
      on public.reminders for update to authenticated
      using (owner_id = auth.uid()) with check (owner_id = auth.uid())';
  end if;
  if not exists (select 1 from pg_policies where tablename='reminders' and policyname='Owners can delete their own reminders') then
    execute 'create policy "Owners can delete their own reminders"
      on public.reminders for delete to authenticated using (owner_id = auth.uid())';
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 6. APPOINTMENTS TABLE — add rejected status
-- The existing code uses: pending, confirmed,
-- completed, cancelled. We add 'rejected' so vets
-- can distinguish their rejection from owner cancels.
-- NOTE: Only run this if your appointments table
-- already has a status check constraint you need to
-- update. If it is a free-text column, skip this.
-- ────────────────────────────────────────────────────

-- Attempt to widen the status constraint if it exists
do $$ begin
  -- Drop existing narrow constraint if present
  if exists (
    select 1 from pg_constraint
    where conname = 'appointments_status_check'
  ) then
    alter table public.appointments
      drop constraint appointments_status_check;
    alter table public.appointments
      add constraint appointments_status_check
        check (status in
          ('pending','confirmed','completed','cancelled','rejected'));
    raise notice 'appointments_status_check updated to include rejected';
  else
    raise notice 'No appointments_status_check found — status column is unconstrained or named differently. No change made.';
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 7. STORAGE BUCKETS
-- Creates buckets if they don't exist, then adds
-- RLS policies idempotently.
-- ────────────────────────────────────────────────────

-- Create buckets
insert into storage.buckets (id, name, public, file_size_limit)
values ('pet-photos', 'pet-photos', true, 5242880)   -- 5 MB, public
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit)
values ('medical-documents', 'medical-documents', false, 20971520)  -- 20 MB, private
on conflict (id) do nothing;

-- ── pet-photos policies ──────────────────────────────
do $$ begin
  -- Owners: upload under their own user-id folder
  if not exists (select 1 from pg_policies
    where tablename='objects' and schemaname='storage'
    and policyname='pet-photos: owners upload') then
    execute $pol$
      create policy "pet-photos: owners upload"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'pet-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $pol$;
  end if;

  -- Public: anyone can read pet photos (they are profile pictures)
  if not exists (select 1 from pg_policies
    where tablename='objects' and schemaname='storage'
    and policyname='pet-photos: public read') then
    execute $pol$
      create policy "pet-photos: public read"
      on storage.objects for select to public
      using (bucket_id = 'pet-photos')
    $pol$;
  end if;

  -- Owners: update their own pet photos
  if not exists (select 1 from pg_policies
    where tablename='objects' and schemaname='storage'
    and policyname='pet-photos: owners update') then
    execute $pol$
      create policy "pet-photos: owners update"
      on storage.objects for update to authenticated
      using (
        bucket_id = 'pet-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $pol$;
  end if;

  -- Owners: delete their own pet photos
  if not exists (select 1 from pg_policies
    where tablename='objects' and schemaname='storage'
    and policyname='pet-photos: owners delete') then
    execute $pol$
      create policy "pet-photos: owners delete"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'pet-photos'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $pol$;
  end if;
end $$;

-- ── medical-documents policies ───────────────────────
-- Layout: medical-documents/<owner_user_id>/<pet_id>/<filename>
-- Owners upload their own documents.
-- Veterinarians can read any medical document (they treat patients).
-- Nobody else can access.
do $$ begin
  -- Owners: upload documents under their own folder
  if not exists (select 1 from pg_policies
    where tablename='objects' and schemaname='storage'
    and policyname='medical-documents: owners upload') then
    execute $pol$
      create policy "medical-documents: owners upload"
      on storage.objects for insert to authenticated
      with check (
        bucket_id = 'medical-documents'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $pol$;
  end if;

  -- Owners: read their own documents
  if not exists (select 1 from pg_policies
    where tablename='objects' and schemaname='storage'
    and policyname='medical-documents: owners read') then
    execute $pol$
      create policy "medical-documents: owners read"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'medical-documents'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $pol$;
  end if;

  -- Veterinarians: read any medical document
  if not exists (select 1 from pg_policies
    where tablename='objects' and schemaname='storage'
    and policyname='medical-documents: vets read') then
    execute $pol$
      create policy "medical-documents: vets read"
      on storage.objects for select to authenticated
      using (
        bucket_id = 'medical-documents'
        and exists (
          select 1 from public.profiles
          where id = auth.uid() and role = 'veterinarian'
        )
      )
    $pol$;
  end if;

  -- Owners: delete their own documents
  if not exists (select 1 from pg_policies
    where tablename='objects' and schemaname='storage'
    and policyname='medical-documents: owners delete') then
    execute $pol$
      create policy "medical-documents: owners delete"
      on storage.objects for delete to authenticated
      using (
        bucket_id = 'medical-documents'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $pol$;
  end if;
end $$;

-- ────────────────────────────────────────────────────
-- 8. FOUR DEMO PETS FOR hum133@gmail.com
--
-- ALL health data, medical records, vaccination
-- records, weights, microchip IDs, allergy and
-- condition information below is FICTIONAL DEMO DATA
-- created solely for software testing. It does not
-- represent genuine veterinary history.
--
-- Idempotency strategy:
--   Pets:    where-not-exists guard (no unique
--            constraint on owner+name to avoid
--            breaking real users with same-name pets)
--   Weights: unique(pet_id, recorded_at) — ON CONFLICT
--   Vaccins: unique(pet_id, vaccine_name, vaccination_date) — ON CONFLICT
--   Records: where-not-exists guard by (pet_id, record_date, diagnosis)
--   Reminders: unique(owner_id, pet_id, type, title, due_date) — ON CONFLICT
-- ────────────────────────────────────────────────────

do $$
declare
  v_owner_id   uuid;
  v_bruno_id   uuid;
  v_bella_id   uuid;
  v_max_id     uuid;
  v_daisy_id   uuid;
begin

  -- ── Resolve owner ─────────────────────────────────
  select id into v_owner_id
  from auth.users
  where email = 'hum133@gmail.com';

  if v_owner_id is null then
    raise notice 'User hum133@gmail.com not found — skipping all demo data';
    return;
  end if;

  raise notice 'Resolved hum133@gmail.com → owner_id = %', v_owner_id;

  -- ── BRUNO ─────────────────────────────────────────
  -- [DEMO DATA] Labrador Retriever, Male
  select id into v_bruno_id
  from public.pets
  where owner_id = v_owner_id and name = 'Bruno'
  limit 1;

  if v_bruno_id is null then
    insert into public.pets (
      owner_id, name, species, breed, gender, date_of_birth, weight,
      vaccination_status, is_neutered, allergies, medical_conditions,
      microchip_id, special_notes
    ) values (
      v_owner_id, 'Bruno', 'Dog', 'Labrador Retriever', 'Male',
      '2022-06-15', 28,
      'fully_vaccinated', true,
      null,   -- [DEMO] no allergies recorded
      null,   -- [DEMO] no conditions recorded
      'DEMO-CHIP-001',
      '[DEMO DATA — NOT REAL] Fictional demonstration profile for software testing only.'
    )
    returning id into v_bruno_id;
    raise notice 'Created Bruno → %', v_bruno_id;
  else
    raise notice 'Bruno already exists → %', v_bruno_id;
  end if;

  -- ── BELLA ─────────────────────────────────────────
  -- [DEMO DATA] Golden Retriever, Female
  select id into v_bella_id
  from public.pets
  where owner_id = v_owner_id and name = 'Bella'
  limit 1;

  if v_bella_id is null then
    insert into public.pets (
      owner_id, name, species, breed, gender, date_of_birth, weight,
      vaccination_status, is_neutered, allergies, medical_conditions,
      microchip_id, special_notes
    ) values (
      v_owner_id, 'Bella', 'Dog', 'Golden Retriever', 'Female',
      '2023-03-20', 24,
      'partially_vaccinated', false,
      null,   -- [DEMO] no allergies recorded
      null,   -- [DEMO] no conditions recorded
      'DEMO-CHIP-002',
      '[DEMO DATA — NOT REAL] Fictional demonstration profile for software testing only.'
    )
    returning id into v_bella_id;
    raise notice 'Created Bella → %', v_bella_id;
  else
    raise notice 'Bella already exists → %', v_bella_id;
  end if;

  -- ── MAX ───────────────────────────────────────────
  -- [DEMO DATA] German Shepherd, Male
  select id into v_max_id
  from public.pets
  where owner_id = v_owner_id and name = 'Max'
  limit 1;

  if v_max_id is null then
    insert into public.pets (
      owner_id, name, species, breed, gender, date_of_birth, weight,
      vaccination_status, is_neutered, allergies, medical_conditions,
      microchip_id, special_notes
    ) values (
      v_owner_id, 'Max', 'Dog', 'German Shepherd', 'Male',
      '2021-09-12', 32,
      'fully_vaccinated', true,
      '[DEMO] Chicken-based proteins — mild sensitivity (fictional)',
      '[DEMO] Mild hip dysplasia — monitored (fictional)',
      'DEMO-CHIP-003',
      '[DEMO DATA — NOT REAL] Fictional demonstration profile for software testing only.'
    )
    returning id into v_max_id;
    raise notice 'Created Max → %', v_max_id;
  else
    raise notice 'Max already exists → %', v_max_id;
  end if;

  -- ── DAISY ─────────────────────────────────────────
  -- [DEMO DATA] Beagle, Female
  select id into v_daisy_id
  from public.pets
  where owner_id = v_owner_id and name = 'Daisy'
  limit 1;

  if v_daisy_id is null then
    insert into public.pets (
      owner_id, name, species, breed, gender, date_of_birth, weight,
      vaccination_status, is_neutered, allergies, medical_conditions,
      microchip_id, special_notes
    ) values (
      v_owner_id, 'Daisy', 'Dog', 'Beagle', 'Female',
      '2023-11-08', 12,
      'partially_vaccinated', false,
      null,
      null,
      'DEMO-CHIP-004',
      '[DEMO DATA — NOT REAL] Fictional demonstration profile for software testing only.'
    )
    returning id into v_daisy_id;
    raise notice 'Created Daisy → %', v_daisy_id;
  else
    raise notice 'Daisy already exists → %', v_daisy_id;
  end if;

  -- ── WEIGHT HISTORY ────────────────────────────────
  -- [DEMO DATA] All weights below are fictional.
  -- unique(pet_id, recorded_at) prevents re-run duplicates.
  insert into public.pet_weights (pet_id, weight_kg, recorded_at, notes) values
    (v_bruno_id, 24.5, '2024-01-10', '[DEMO] Fictional weight — not real'),
    (v_bruno_id, 25.8, '2024-04-15', '[DEMO] Fictional weight — not real'),
    (v_bruno_id, 26.9, '2024-07-20', '[DEMO] Fictional weight — not real'),
    (v_bruno_id, 27.5, '2024-10-05', '[DEMO] Fictional weight — not real'),
    (v_bruno_id, 28.0, '2025-01-12', '[DEMO] Fictional weight — not real'),
    (v_bruno_id, 28.3, '2025-05-08', '[DEMO] Fictional weight — not real'),
    (v_bella_id, 20.0, '2024-03-20', '[DEMO] Fictional weight — not real'),
    (v_bella_id, 21.5, '2024-06-15', '[DEMO] Fictional weight — not real'),
    (v_bella_id, 22.8, '2024-09-10', '[DEMO] Fictional weight — not real'),
    (v_bella_id, 23.5, '2025-01-08', '[DEMO] Fictional weight — not real'),
    (v_bella_id, 24.0, '2025-05-20', '[DEMO] Fictional weight — not real'),
    (v_max_id,   29.0, '2023-09-12', '[DEMO] Fictional weight — not real'),
    (v_max_id,   30.5, '2024-01-15', '[DEMO] Fictional weight — not real'),
    (v_max_id,   31.2, '2024-06-20', '[DEMO] Fictional weight — not real'),
    (v_max_id,   32.0, '2025-01-10', '[DEMO] Fictional weight — not real'),
    (v_daisy_id,  9.5, '2024-11-08', '[DEMO] Fictional weight — not real'),
    (v_daisy_id, 10.8, '2025-01-15', '[DEMO] Fictional weight — not real'),
    (v_daisy_id, 12.0, '2025-05-10', '[DEMO] Fictional weight — not real')
  on conflict (pet_id, recorded_at) do nothing;

  -- ── VACCINATIONS ──────────────────────────────────
  -- [DEMO DATA] All vaccination records below are fictional.
  -- unique(pet_id, vaccine_name, vaccination_date) prevents duplicates.
  insert into public.vaccinations
    (pet_id, vaccine_name, vaccination_date, next_due_date, status, notes)
  values
    -- Bruno: fully vaccinated
    (v_bruno_id, 'Rabies',        '2023-06-20', '2026-06-20', 'administered', '[DEMO] Fictional — not real'),
    (v_bruno_id, 'DHPP',          '2023-06-20', '2024-06-20', 'administered', '[DEMO] Fictional — not real'),
    (v_bruno_id, 'Bordetella',    '2024-06-20', '2025-06-20', 'administered', '[DEMO] Fictional — not real'),
    (v_bruno_id, 'Leptospirosis', '2024-06-20', '2025-06-20', 'administered', '[DEMO] Fictional — not real'),
    -- Bella: partially vaccinated
    (v_bella_id, 'Rabies',        '2024-03-25', '2025-03-25', 'administered', '[DEMO] Fictional — not real'),
    (v_bella_id, 'DHPP',          '2024-03-25', '2025-03-25', 'administered', '[DEMO] Fictional — not real'),
    (v_bella_id, 'Bordetella',    '2024-03-25', '2025-03-25', 'administered', '[DEMO] Fictional — not real'),
    -- Max: fully vaccinated
    (v_max_id,   'Rabies',        '2022-09-15', '2025-09-15', 'administered', '[DEMO] Fictional — not real'),
    (v_max_id,   'DHPP',          '2022-09-15', '2023-09-15', 'administered', '[DEMO] Fictional — not real'),
    (v_max_id,   'DHPP Booster',  '2023-09-15', '2024-09-15', 'administered', '[DEMO] Fictional — not real'),
    (v_max_id,   'Bordetella',    '2024-09-15', '2025-09-15', 'administered', '[DEMO] Fictional — not real'),
    (v_max_id,   'Leptospirosis', '2024-09-15', '2025-09-15', 'administered', '[DEMO] Fictional — not real'),
    -- Daisy: puppy series (partially vaccinated)
    (v_daisy_id, 'DHPP Puppy #1', '2024-01-10', null,         'administered', '[DEMO] Fictional — not real'),
    (v_daisy_id, 'DHPP Puppy #2', '2024-02-07', null,         'administered', '[DEMO] Fictional — not real'),
    (v_daisy_id, 'Rabies',        '2024-03-05', '2025-03-05', 'administered', '[DEMO] Fictional — not real')
  on conflict (pet_id, vaccine_name, vaccination_date) do nothing;

  -- ── MEDICAL RECORDS ───────────────────────────────
  -- [DEMO DATA] All consultations, diagnoses, symptoms,
  -- treatments, prescriptions and medication instructions
  -- below are entirely fictional and are included only
  -- to demonstrate the application's features.
  -- Guards: only insert if no record exists for that
  -- (pet_id, record_date, diagnosis) combination.

  -- Bruno records
  if not exists (select 1 from public.medical_records
    where pet_id = v_bruno_id and record_date = '2024-03-10'
      and diagnosis = '[DEMO] Mild ear infection — fictional') then
    insert into public.medical_records (
      pet_id, record_date, record_type, veterinarian_name,
      diagnosis, treatment, symptoms,
      prescription, medication_instructions, follow_up_date, notes
    ) values (
      v_bruno_id, '2024-03-10', 'consultation', '[DEMO] Dr. Sarah Mitchell (fictional)',
      '[DEMO] Mild ear infection — fictional',
      '[DEMO] Ear drops — fictional',
      '[DEMO] Scratching at ear, head shaking — fictional',
      '[DEMO] Otomax ear drops — fictional',
      '[DEMO] 4 drops twice daily for 7 days — fictional',
      '2024-03-17',
      '[DEMO DATA — NOT REAL] This medical record is fictional and for testing only.'
    );
  end if;

  if not exists (select 1 from public.medical_records
    where pet_id = v_bruno_id and record_date = '2024-08-22'
      and diagnosis = '[DEMO] Annual wellness exam — fictional') then
    insert into public.medical_records (
      pet_id, record_date, record_type, veterinarian_name,
      diagnosis, treatment, symptoms,
      prescription, medication_instructions, follow_up_date, notes
    ) values (
      v_bruno_id, '2024-08-22', 'consultation', '[DEMO] Dr. James Walker (fictional)',
      '[DEMO] Annual wellness exam — fictional',
      '[DEMO] Heartworm prevention continued — fictional',
      null,
      '[DEMO] Heartgard Plus — fictional',
      '[DEMO] One chew monthly — fictional',
      null,
      '[DEMO DATA — NOT REAL] This medical record is fictional and for testing only.'
    );
  end if;

  -- Bella records
  if not exists (select 1 from public.medical_records
    where pet_id = v_bella_id and record_date = '2024-05-05'
      and diagnosis = '[DEMO] Puppy wellness check — fictional') then
    insert into public.medical_records (
      pet_id, record_date, record_type, veterinarian_name,
      diagnosis, treatment, symptoms,
      prescription, medication_instructions, follow_up_date, notes
    ) values (
      v_bella_id, '2024-05-05', 'consultation', '[DEMO] Dr. James Walker (fictional)',
      '[DEMO] Puppy wellness check — fictional',
      '[DEMO] Core vaccines given — fictional',
      null, null, null, '2024-08-05',
      '[DEMO DATA — NOT REAL] This medical record is fictional and for testing only.'
    );
  end if;

  if not exists (select 1 from public.medical_records
    where pet_id = v_bella_id and record_date = '2024-11-18'
      and diagnosis = '[DEMO] Mild gastroenteritis — fictional') then
    insert into public.medical_records (
      pet_id, record_date, record_type, veterinarian_name,
      diagnosis, treatment, symptoms,
      prescription, medication_instructions, follow_up_date, notes
    ) values (
      v_bella_id, '2024-11-18', 'consultation', '[DEMO] Dr. Sarah Mitchell (fictional)',
      '[DEMO] Mild gastroenteritis — fictional',
      '[DEMO] Bland diet and probiotics — fictional',
      '[DEMO] Vomiting, loose stool — fictional',
      '[DEMO] Metronidazole 250mg — fictional',
      '[DEMO] Twice daily with food for 5 days — fictional',
      '2024-11-25',
      '[DEMO DATA — NOT REAL] This medical record is fictional and for testing only.'
    );
  end if;

  -- Max records
  if not exists (select 1 from public.medical_records
    where pet_id = v_max_id and record_date = '2024-04-15'
      and diagnosis = '[DEMO] Hip dysplasia monitoring — fictional') then
    insert into public.medical_records (
      pet_id, record_date, record_type, veterinarian_name,
      diagnosis, treatment, symptoms,
      prescription, medication_instructions, follow_up_date, notes
    ) values (
      v_max_id, '2024-04-15', 'consultation', '[DEMO] Dr. James Walker (fictional)',
      '[DEMO] Hip dysplasia monitoring — fictional',
      '[DEMO] Joint supplement added — fictional',
      '[DEMO] Occasional stiffness after rest — fictional',
      '[DEMO] Cosequin DS — fictional',
      '[DEMO] Two chews daily, ongoing — fictional',
      '2024-10-15',
      '[DEMO DATA — NOT REAL] This medical record is fictional and for testing only.'
    );
  end if;

  -- Daisy records
  if not exists (select 1 from public.medical_records
    where pet_id = v_daisy_id and record_date = '2025-02-10'
      and diagnosis = '[DEMO] Puppy 3-month wellness check — fictional') then
    insert into public.medical_records (
      pet_id, record_date, record_type, veterinarian_name,
      diagnosis, treatment, symptoms,
      prescription, medication_instructions, follow_up_date, notes
    ) values (
      v_daisy_id, '2025-02-10', 'consultation', '[DEMO] Dr. Sarah Mitchell (fictional)',
      '[DEMO] Puppy 3-month wellness check — fictional',
      '[DEMO] Dewormer, flea prevention — fictional',
      null,
      '[DEMO] Heartgard Plus (puppy) — fictional',
      '[DEMO] One chew monthly — fictional',
      null,
      '[DEMO DATA — NOT REAL] This medical record is fictional and for testing only.'
    );
  end if;

  -- ── REMINDERS ─────────────────────────────────────
  -- [DEMO DATA] Generated from fictional vaccination
  -- due dates above. Not real health reminders.
  -- unique(owner_id, pet_id, type, title, due_date) prevents duplicates.
  insert into public.reminders
    (owner_id, pet_id, type, title, due_date, notes)
  values
    (v_owner_id, v_bruno_id, 'vaccination', 'Bordetella vaccination',    '2025-06-20', '[DEMO] Fictional reminder'),
    (v_owner_id, v_bruno_id, 'vaccination', 'Leptospirosis vaccination', '2025-06-20', '[DEMO] Fictional reminder'),
    (v_owner_id, v_bella_id, 'vaccination', 'Rabies booster',            '2025-03-25', '[DEMO] Fictional reminder'),
    (v_owner_id, v_bella_id, 'vaccination', 'DHPP booster',              '2025-03-25', '[DEMO] Fictional reminder'),
    (v_owner_id, v_max_id,   'vaccination', 'Rabies triennial',          '2025-09-15', '[DEMO] Fictional reminder'),
    (v_owner_id, v_max_id,   'medication',  'Joint supplement refill',   '2025-12-01', '[DEMO] Fictional reminder'),
    (v_owner_id, v_daisy_id, 'vaccination', 'Rabies booster',            '2025-03-05', '[DEMO] Fictional reminder'),
    (v_owner_id, v_daisy_id, 'vaccination', 'DHPP annual',               '2025-03-10', '[DEMO] Fictional reminder')
  on conflict (owner_id, pet_id, type, title, due_date) do nothing;

  raise notice 'Demo data complete for hum133@gmail.com (owner_id: %)', v_owner_id;
  raise notice 'Pets: Bruno=%, Bella=%, Max=%, Daisy=%',
    v_bruno_id, v_bella_id, v_max_id, v_daisy_id;

end $$;

-- ====================================================
-- END OF MIGRATION
-- ====================================================
-- After running this, verify in Supabase Table Editor:
--   auth.users        — hum133@gmail.com exists
--   public.pets       — 4 rows for that owner
--   public.pet_weights — 18 rows total
--   public.vaccinations — 15 rows total
--   public.medical_records — 6 rows total
--   public.reminders  — 8 rows total
--   storage.buckets   — pet-photos (public), medical-documents (private)
-- ====================================================
