-- ============================================================================
-- Workout Tracker - Phase 1 schema
-- Run ONCE in the Supabase SQL editor (Dashboard -> SQL Editor -> New query).
--
-- IMPORTANT: in the SQL Editor, set the "Run as" dropdown (top-right) to
-- `postgres` before running this. It defaults to `authenticated`, which has
-- USAGE but not CREATE on the public schema and fails with:
--   42501 permission denied for schema public
--
-- Safe to re-run: tables/indexes use IF NOT EXISTS and RLS policies are
-- dropped and recreated. Nothing is destructive.
--
-- Every table carries user_id and is protected by Row Level Security so a
-- row is only ever visible to the signed-in owner (auth.uid() = user_id).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 0. Prerequisites
-- ---------------------------------------------------------------------------
create extension if not exists pgcrypto with schema extensions;

grant usage on schema public to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Catalogue: muscle groups -> muscles -> exercises -> machines
-- ---------------------------------------------------------------------------

-- Coarse category, e.g. "Delts", "Chest", "Back".
create table if not exists public.muscle_groups (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null,
  order_index integer not null default 0,
  created_at  timestamptz not null default now(),
  unique (user_id, name)
);

-- Specific muscle, e.g. "Rear Delts", belonging to one group.
create table if not exists public.muscles (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null default auth.uid() references auth.users (id) on delete cascade,
  muscle_group_id uuid not null references public.muscle_groups (id) on delete cascade,
  name            text not null,
  order_index     integer not null default 0,
  created_at      timestamptz not null default now(),
  unique (user_id, name)
);

-- The movement / category, e.g. "Rear Delt Fly".
create table if not exists public.exercises (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name          text not null,
  muscle_id     uuid references public.muscles (id) on delete set null,
  -- Stretch / Cardio / Anchor / Accessory / Isolation
  role          text check (role in ('stretch', 'cardio', 'anchor', 'accessory', 'isolation')),
  -- Organisation hint for composing routines: Push / Pull / Other / Leg
  day_tag       text check (day_tag in ('push', 'pull', 'other', 'leg')),
  tracking_type text not null default 'weight_reps'
    check (tracking_type in ('weight_reps', 'reps_only', 'duration', 'distance', 'weight_duration')),
  notes         text,
  archived      boolean not null default false,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, name)
);
-- A specific physical apparatus, e.g. "Rear Delt Machine (Matrix)".
create table if not exists public.machines (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  -- Free Weight / Basic Machine / Fancy Machine / Cable Machine
  type       text check (type in ('free_weight', 'basic_machine', 'fancy_machine', 'cable_machine')),
  notes      text,
  archived   boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, name)
);

-- Link an exercise to a machine. Holds the exercise-on-machine setup data:
-- seat/handle/grip parameters, a reference video and variant notes.
-- parameters is a JSON array of { "label": text, "value": text } objects.
create table if not exists public.exercise_machines (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null default auth.uid() references auth.users (id) on delete cascade,
  exercise_id   uuid not null references public.exercises (id) on delete cascade,
  machine_id    uuid not null references public.machines (id) on delete cascade,
  parameters    jsonb not null default '[]'::jsonb,
  reference_url text,
  notes         text,
  is_default    boolean not null default false,
  created_at    timestamptz not null default now(),
  unique (exercise_id, machine_id)
);

-- ---------------------------------------------------------------------------
-- 2. Routines: routine -> routine days -> routine items (slots)
--
-- A routine item is one exercise placed in a workout day. round_number:
--   NULL      -> Fixed      (appears in every round)
--   1 / 2 / 3 -> appears only in that round (Round 1 / Round 2 / ...)
--   (no row)  -> Hidden     (not part of that day)
-- Items sharing an order_index but different round_number are the same
-- logical slot (e.g. Hammer Curls on Round 1, Bicep Curls on Round 2).
-- ---------------------------------------------------------------------------

create table if not exists public.routines (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name              text not null,
  is_active         boolean not null default false,
  current_day_index integer not null default 0,
  notes             text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create table if not exists public.routine_days (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id  uuid not null references public.routines (id) on delete cascade,
  name        text not null,
  order_index integer not null default 0,
  round_count integer not null default 1,
  created_at  timestamptz not null default now(),
  unique (routine_id, order_index)
);

create table if not exists public.routine_items (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_day_id uuid not null references public.routine_days (id) on delete cascade,
  order_index    integer not null default 0,
  round_number   integer,
  exercise_id    uuid not null references public.exercises (id) on delete restrict,
  machine_id     uuid references public.machines (id) on delete set null,
  notes          text,
  created_at     timestamptz not null default now(),
  unique (routine_day_id, order_index, round_number)
);

-- ---------------------------------------------------------------------------
-- 3. Workout history: sessions -> session exercises -> sets
--
-- Sessions snapshot the routine day so editing routines later never rewrites
-- history. day_name is stored explicitly for the same reason.
-- ---------------------------------------------------------------------------

create table if not exists public.sessions (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  routine_id     uuid references public.routines (id) on delete set null,
  routine_day_id uuid references public.routine_days (id) on delete set null,
  day_name       text,
  session_date   date not null default current_date,
  round_number   integer not null default 1,
  status         text not null default 'in_progress'
    check (status in ('in_progress', 'completed', 'abandoned')),
  notes          text,
  started_at     timestamptz not null default now(),
  completed_at   timestamptz,
  created_at     timestamptz not null default now()
);

create table if not exists public.session_exercises (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id          uuid not null references public.sessions (id) on delete cascade,
  planned_exercise_id uuid references public.exercises (id) on delete set null,
  exercise_id         uuid references public.exercises (id) on delete set null,
  machine_id          uuid references public.machines (id) on delete set null,
  order_index         integer not null default 0,
  status              text not null default 'pending'
    check (status in ('pending', 'done', 'skipped')),
  notes               text,
  created_at          timestamptz not null default now()
);

-- Individual sets. weight is nullable so bodyweight / machine-0 entries work.
create table if not exists public.sets (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_exercise_id uuid not null references public.session_exercises (id) on delete cascade,
  set_index           integer not null default 0,
  weight              numeric,
  reps                integer,
  duration_seconds    integer,
  distance_meters     numeric,
  is_warmup           boolean not null default false,
  created_at          timestamptz not null default now(),
  unique (session_exercise_id, set_index)
);

-- ---------------------------------------------------------------------------
-- 4. Keepalive: manual ping so the free-tier project does not pause after
--    7 days of inactivity. A row is inserted by the "Ping" button.
-- ---------------------------------------------------------------------------
create table if not exists public.keepalive (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  note       text,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- 5. Indexes for common lookups
-- ---------------------------------------------------------------------------
create index if not exists muscles_group_idx             on public.muscles (muscle_group_id);
create index if not exists exercises_muscle_idx          on public.exercises (muscle_id);
create index if not exists exercise_machines_ex_idx      on public.exercise_machines (exercise_id);
create index if not exists exercise_machines_machine_idx on public.exercise_machines (machine_id);
create index if not exists routine_days_routine_idx      on public.routine_days (routine_id);
create index if not exists routine_items_day_idx         on public.routine_items (routine_day_id);
create index if not exists sessions_user_date_idx        on public.sessions (user_id, session_date desc);
create index if not exists session_exercises_session_idx on public.session_exercises (session_id);
create index if not exists sets_session_exercise_idx     on public.sets (session_exercise_id);

-- ---------------------------------------------------------------------------
-- 6. updated_at maintenance
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_exercises_updated_at on public.exercises;
create trigger trg_exercises_updated_at before update on public.exercises
  for each row execute function public.set_updated_at();

drop trigger if exists trg_machines_updated_at on public.machines;
create trigger trg_machines_updated_at before update on public.machines
  for each row execute function public.set_updated_at();

drop trigger if exists trg_routines_updated_at on public.routines;
create trigger trg_routines_updated_at before update on public.routines
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 7. Row Level Security: every row is scoped to its owner.
-- ---------------------------------------------------------------------------
do $$
declare
  t text;
begin
  foreach t in array array[
    'muscle_groups', 'muscles', 'exercises', 'machines', 'exercise_machines',
    'routines', 'routine_days', 'routine_items',
    'sessions', 'session_exercises', 'sets', 'keepalive'
  ]
  loop
    execute format('alter table public.%I enable row level security;', t);
    execute format('drop policy if exists %I on public.%I;', t || '_owner', t);
    execute format(
      'create policy %I on public.%I for all '
      || 'using (auth.uid() = user_id) with check (auth.uid() = user_id);',
      t || '_owner', t
    );
  end loop;
end $$;

-- Grants (RLS still restricts rows to the owner).
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Verification
-- ---------------------------------------------------------------------------
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in (
    'muscle_groups', 'muscles', 'exercises', 'machines', 'exercise_machines',
    'routines', 'routine_days', 'routine_items',
    'sessions', 'session_exercises', 'sets', 'keepalive'
  )
order by table_name;



