-- Pisga companion app · privileges and row-level security
--
-- Principles
--   1. Every policy checks membership of the Pisga app, because the Supabase project is
--      shared with other NGG apps whose users can also authenticate against it.
--   2. Personal tables (mapping, journal, north star, advisor) are readable and writable
--      only by the participant who owns the row. Staff roles have no policy on them.
--   3. Shared content is readable by members and writable by the two staff roles.
--   4. The `anon` role receives no privilege at all.

-- ---------------------------------------------------------------------------
-- Helper functions (security definer, kept outside the API-exposed schema)
-- ---------------------------------------------------------------------------

create function pisga_private.member_role()
returns text
language sql stable security definer set search_path = ''
as $$
  select m.role
  from pisga.app_memberships m
  where m.user_id = (select auth.uid()) and m.app = 'pisga'
$$;

create function pisga_private.is_member()
returns boolean
language sql stable security definer set search_path = ''
as $$ select pisga_private.member_role() is not null $$;

create function pisga_private.is_staff()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(pisga_private.member_role() in ('ngg_facilitator', 'maccabi_learning'), false) $$;

create function pisga_private.is_participant()
returns boolean
language sql stable security definer set search_path = ''
as $$ select coalesce(pisga_private.member_role() = 'participant', false) $$;

-- "Today" for the programme is the calendar date in Israel.
create function pisga_private.today_il()
returns date
language sql stable set search_path = ''
as $$ select (now() at time zone 'Asia/Jerusalem')::date $$;

-- A session's journal station opens on the session's date.
create function pisga_private.session_is_open(p_session smallint)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from pisga.sessions s
    where s.number = p_session
      and s.session_date is not null
      and s.session_date <= pisga_private.today_il()
  )
$$;

create function pisga_private.question_is_open(p_question uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from pisga.journal_questions q
    where q.id = p_question and pisga_private.session_is_open(q.session_number)
  )
$$;

-- The questionnaire opens when staff publish it. The closing round opens on the date of session 12.
create function pisga_private.mapping_round_is_open(p_round text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select coalesce((select s.value = 'true'::jsonb from pisga.app_settings s where s.key = 'mapping_published'), false)
     and (p_round = 'start' or (p_round = 'end' and pisga_private.session_is_open(12::smallint)))
$$;

create function pisga_private.mapping_is_completed(p_round text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from pisga.mapping_completions c
    where c.user_id = (select auth.uid()) and c.round = p_round
  )
$$;

create function pisga_private.mapping_all_answered(p_round text)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select (select count(*) from pisga.mapping_statements) > 0
     and (select count(*) from pisga.mapping_statements)
       = (select count(*) from pisga.mapping_responses r
          where r.user_id = (select auth.uid()) and r.round = p_round)
$$;

revoke all on all functions in schema pisga_private from public;
grant usage on schema pisga_private to authenticated, service_role;
grant execute on all functions in schema pisga_private to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Table privileges (row-level security then narrows them)
-- ---------------------------------------------------------------------------

revoke all on schema pisga from public;
grant usage on schema pisga to authenticated, service_role;
grant all on all tables in schema pisga to service_role;

grant select on pisga.app_memberships, pisga.profiles to authenticated;

grant select, insert, update, delete on
  pisga.gates, pisga.sessions, pisga.session_speakers, pisga.session_materials, pisga.app_settings,
  pisga.mapping_statements, pisga.journal_questions, pisga.project_teams, pisga.project_stages
to authenticated;

grant select, insert, update on
  pisga.mapping_responses, pisga.mapping_open_answers, pisga.journal_entries, pisga.north_star_versions
to authenticated;

grant select, insert on pisga.mapping_completions to authenticated;
grant select, insert, update, delete on pisga.advisor_summaries to authenticated;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  for t in select tablename from pg_tables where schemaname = 'pisga' loop
    execute format('alter table pisga.%I enable row level security', t);
  end loop;
end;
$$;

-- Membership and profile: each user reads only their own row.
create policy memberships_read_own on pisga.app_memberships
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy profiles_read_own on pisga.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_member()));

-- Shared content: members read, staff write.
do $$
declare
  t text;
begin
  foreach t in array array[
    'gates', 'sessions', 'session_speakers', 'session_materials', 'app_settings',
    'mapping_statements', 'project_teams', 'project_stages'
  ] loop
    execute format(
      'create policy %I on pisga.%I for select to authenticated
         using ((select pisga_private.is_member()))', t || '_member_read', t);
    execute format(
      'create policy %I on pisga.%I for insert to authenticated
         with check ((select pisga_private.is_staff()))', t || '_staff_insert', t);
    execute format(
      'create policy %I on pisga.%I for update to authenticated
         using ((select pisga_private.is_staff())) with check ((select pisga_private.is_staff()))',
      t || '_staff_update', t);
    execute format(
      'create policy %I on pisga.%I for delete to authenticated
         using ((select pisga_private.is_staff()))', t || '_staff_delete', t);
  end loop;
end;
$$;

-- Journal questions: staff always; participants only once the session's date has arrived.
create policy journal_questions_read on pisga.journal_questions
  for select to authenticated
  using (
    (select pisga_private.is_staff())
    or ((select pisga_private.is_participant()) and pisga_private.session_is_open(session_number))
  );
create policy journal_questions_staff_insert on pisga.journal_questions
  for insert to authenticated with check ((select pisga_private.is_staff()));
create policy journal_questions_staff_update on pisga.journal_questions
  for update to authenticated
  using ((select pisga_private.is_staff())) with check ((select pisga_private.is_staff()));
create policy journal_questions_staff_delete on pisga.journal_questions
  for delete to authenticated using ((select pisga_private.is_staff()));

-- Mapping answers: owner only, while the round is open and not yet completed.
create policy mapping_responses_read_own on pisga.mapping_responses
  for select to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()));
create policy mapping_responses_insert_own on pisga.mapping_responses
  for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select pisga_private.is_participant())
    and pisga_private.mapping_round_is_open(round) and not pisga_private.mapping_is_completed(round)
  );
create policy mapping_responses_update_own on pisga.mapping_responses
  for update to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()))
  with check (
    user_id = (select auth.uid()) and (select pisga_private.is_participant())
    and pisga_private.mapping_round_is_open(round) and not pisga_private.mapping_is_completed(round)
  );

create policy mapping_open_answers_read_own on pisga.mapping_open_answers
  for select to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()));
create policy mapping_open_answers_insert_own on pisga.mapping_open_answers
  for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select pisga_private.is_participant())
    and pisga_private.mapping_round_is_open(round) and not pisga_private.mapping_is_completed(round)
  );
create policy mapping_open_answers_update_own on pisga.mapping_open_answers
  for update to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()))
  with check (
    user_id = (select auth.uid()) and (select pisga_private.is_participant())
    and pisga_private.mapping_round_is_open(round) and not pisga_private.mapping_is_completed(round)
  );

-- A round can be marked complete only when every statement has been answered.
create policy mapping_completions_read_own on pisga.mapping_completions
  for select to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()));
create policy mapping_completions_insert_own on pisga.mapping_completions
  for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select pisga_private.is_participant())
    and pisga_private.mapping_round_is_open(round) and pisga_private.mapping_all_answered(round)
  );

-- Journal entries and north-star versions: owner only, once the session's date has arrived.
create policy journal_entries_read_own on pisga.journal_entries
  for select to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()));
create policy journal_entries_insert_own on pisga.journal_entries
  for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select pisga_private.is_participant())
    and pisga_private.question_is_open(question_id)
  );
create policy journal_entries_update_own on pisga.journal_entries
  for update to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()))
  with check (
    user_id = (select auth.uid()) and (select pisga_private.is_participant())
    and pisga_private.question_is_open(question_id)
  );

create policy north_star_read_own on pisga.north_star_versions
  for select to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()));
create policy north_star_insert_own on pisga.north_star_versions
  for insert to authenticated
  with check (
    user_id = (select auth.uid()) and (select pisga_private.is_participant())
    and pisga_private.session_is_open(session_number)
  );
create policy north_star_update_own on pisga.north_star_versions
  for update to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()))
  with check (
    user_id = (select auth.uid()) and (select pisga_private.is_participant())
    and pisga_private.session_is_open(session_number)
  );

-- Advisor context summary: owner only.
create policy advisor_summaries_own on pisga.advisor_summaries
  for all to authenticated
  using (user_id = (select auth.uid()) and (select pisga_private.is_participant()))
  with check (user_id = (select auth.uid()) and (select pisga_private.is_participant()));
