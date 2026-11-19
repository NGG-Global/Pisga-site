-- Pisga companion app · schema
-- The Supabase project is shared between several NGG apps. Everything that belongs to
-- Pisga lives in the dedicated schemas `pisga` (tables) and `pisga_private` (helper
-- functions used by row-level security). Nothing is created in `public`.

create schema if not exists pisga;
create schema if not exists pisga_private;

-- ---------------------------------------------------------------------------
-- Membership and profile
-- ---------------------------------------------------------------------------

create table pisga.app_memberships (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  app        text        not null default 'pisga' check (app = 'pisga'),
  role       text        not null check (role in ('participant', 'ngg_facilitator', 'maccabi_learning', 'mentor')),
  created_at timestamptz not null default now(),
  primary key (user_id, app)
);
comment on table pisga.app_memberships is
  'Which user belongs to the Pisga app and in which role. Rows are written only by the provisioning script (secret key).';

-- Prepared for the project space; unused at launch.
create table pisga.project_teams (
  id         uuid     primary key default gen_random_uuid(),
  name       text     not null,
  sector     text,
  sort_order smallint not null default 0
);

create table pisga.project_stages (
  id          uuid     primary key default gen_random_uuid(),
  number      smallint not null unique,
  title       text     not null,
  description text,
  opens_on    date
);

create table pisga.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  team_id      uuid references pisga.project_teams (id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Shared programme content
-- ---------------------------------------------------------------------------

create table pisga.gates (
  number smallint primary key check (number between 1 and 7),
  title  text     not null
);

create table pisga.sessions (
  number       smallint    primary key check (number between 1 and 12),
  title        text,
  session_date date,
  location     text,
  gate_number  smallint    references pisga.gates (number),
  description  text,
  status       text        not null default 'scheduled' check (status in ('scheduled', 'completed')),
  updated_at   timestamptz not null default now()
);
comment on column pisga.sessions.status is
  'A session counts as completed when status = completed, or when its date has passed (Israel time).';

create table pisga.session_speakers (
  id             uuid     primary key default gen_random_uuid(),
  session_number smallint not null references pisga.sessions (number) on delete cascade,
  name           text     not null,
  sort_order     smallint not null default 0
);
create index session_speakers_session_idx on pisga.session_speakers (session_number);

create table pisga.session_materials (
  id             uuid        primary key default gen_random_uuid(),
  session_number smallint    not null references pisga.sessions (number) on delete cascade,
  title          text        not null,
  storage_path   text        not null unique,
  file_ext       text,
  sort_order     smallint    not null default 0,
  created_at     timestamptz not null default now()
);
create index session_materials_session_idx on pisga.session_materials (session_number);

create table pisga.app_settings (
  key        text        primary key,
  value      jsonb       not null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Mapping questionnaire
-- ---------------------------------------------------------------------------

create table pisga.mapping_statements (
  id          uuid        primary key default gen_random_uuid(),
  gate_number smallint    not null references pisga.gates (number),
  sort_order  smallint    not null check (sort_order between 1 and 2),
  body        text        not null check (length(trim(body)) > 0),
  updated_at  timestamptz not null default now(),
  unique (gate_number, sort_order)
);

create table pisga.mapping_responses (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  round        text        not null check (round in ('start', 'end')),
  statement_id uuid        not null references pisga.mapping_statements (id) on delete restrict,
  score        smallint    not null check (score between 1 and 5),
  updated_at   timestamptz not null default now(),
  primary key (user_id, round, statement_id)
);

create table pisga.mapping_open_answers (
  user_id    uuid        not null references auth.users (id) on delete cascade,
  round      text        not null check (round in ('start', 'end')),
  body       text        not null default '',
  updated_at timestamptz not null default now(),
  primary key (user_id, round)
);

-- One row per finished round. Once it exists the answers of that round are locked.
create table pisga.mapping_completions (
  user_id      uuid        not null references auth.users (id) on delete cascade,
  round        text        not null check (round in ('start', 'end')),
  completed_at timestamptz not null default now(),
  primary key (user_id, round)
);

-- ---------------------------------------------------------------------------
-- Journal
-- ---------------------------------------------------------------------------

create table pisga.journal_questions (
  id             uuid        primary key default gen_random_uuid(),
  session_number smallint    not null references pisga.sessions (number) on delete cascade,
  sort_order     smallint    not null check (sort_order between 1 and 4),
  body           text        not null check (length(trim(body)) > 0),
  kind           text        not null default 'open' check (kind in ('open', 'north_star')),
  updated_at     timestamptz not null default now(),
  unique (session_number, sort_order)
);
comment on column pisga.journal_questions.kind is
  'open = free-text answer. north_star = the answer is the participant''s north-star sentence for that session.';

create table pisga.journal_entries (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  question_id uuid        not null references pisga.journal_questions (id) on delete restrict,
  body        text        not null default '',
  updated_at  timestamptz not null default now(),
  primary key (user_id, question_id)
);

-- One version per participant and session; earlier sessions' versions are never overwritten.
create table pisga.north_star_versions (
  user_id        uuid        not null references auth.users (id) on delete cascade,
  session_number smallint    not null references pisga.sessions (number) on delete restrict,
  body           text        not null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  primary key (user_id, session_number)
);

-- ---------------------------------------------------------------------------
-- Advisor
-- ---------------------------------------------------------------------------

create table pisga.advisor_summaries (
  user_id    uuid        primary key references auth.users (id) on delete cascade,
  summary    text        not null default '',
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create function pisga_private.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare
  t text;
begin
  foreach t in array array[
    'sessions', 'app_settings', 'mapping_statements', 'mapping_responses', 'mapping_open_answers',
    'journal_questions', 'journal_entries', 'north_star_versions', 'advisor_summaries'
  ] loop
    execute format(
      'create trigger touch_updated_at before update on pisga.%I
         for each row execute function pisga_private.touch_updated_at()', t);
  end loop;
end;
$$;
