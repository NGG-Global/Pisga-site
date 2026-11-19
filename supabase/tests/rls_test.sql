-- Permission tests for every role. Run with `npm run test:db` (local PostgreSQL only).
-- Each check raises an exception on failure, so a clean run means every check passed.

\set ON_ERROR_STOP on
set client_min_messages = warning;

create schema tests;

create function tests.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('role', 'authenticated', true);
  perform set_config('request.jwt.claims', json_build_object('sub', p_user)::text, true);
end;
$$;

create function tests.act_as_owner() returns void language plpgsql as $$
begin
  perform set_config('role', 'postgres', true);
  perform set_config('request.jwt.claims', '{}', true);
end;
$$;

-- Runs a statement and reports how many rows it returned or affected; -1 means it was refused.
create function tests.run(p_sql text) returns integer language plpgsql as $$
declare
  n integer;
begin
  execute p_sql;
  get diagnostics n = row_count;
  return n;
exception
  when insufficient_privilege or check_violation then return -1;
end;
$$;

create function tests.expect(p_label text, p_actual integer, p_expected integer) returns void language plpgsql as $$
begin
  if p_actual is distinct from p_expected then
    raise exception 'FAILED: % (expected %, got %)', p_label, p_expected, p_actual;
  end if;
  raise warning 'ok   %', p_label;
end;
$$;
grant usage on schema tests to authenticated, anon;
grant execute on all functions in schema tests to authenticated, anon;

begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'participant.a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'participant.b@example.test'),
  ('00000000-0000-0000-0000-00000000000c', 'facilitator@example.test'),
  ('00000000-0000-0000-0000-00000000000d', 'learning@example.test'),
  ('00000000-0000-0000-0000-00000000000e', 'mentor@example.test'),
  ('00000000-0000-0000-0000-00000000000f', 'other.app.user@example.test');

insert into pisga.app_memberships (user_id, role) values
  ('00000000-0000-0000-0000-00000000000a', 'participant'),
  ('00000000-0000-0000-0000-00000000000b', 'participant'),
  ('00000000-0000-0000-0000-00000000000c', 'ngg_facilitator'),
  ('00000000-0000-0000-0000-00000000000d', 'maccabi_learning'),
  ('00000000-0000-0000-0000-00000000000e', 'mentor');
insert into pisga.profiles (user_id, display_name)
  select user_id, 'user ' || role from pisga.app_memberships;

-- Complete the 14 statements and one reflection question per session for the tests.
insert into pisga.mapping_statements (gate_number, sort_order, body)
  select g, o, 'statement ' || g || '.' || o from generate_series(1, 7) g, generate_series(1, 2) o
  on conflict do nothing;
insert into pisga.journal_questions (id, session_number, sort_order, body, kind) values
  ('10000000-0000-0000-0000-000000000001', 1, 1, 'question s1', 'open'),
  ('10000000-0000-0000-0000-000000000002', 2, 1, 'question s2', 'open');
insert into storage.objects (bucket_id, name) values ('pisga-materials', 'session-01/file.pdf');

do $$
declare
  a constant uuid := '00000000-0000-0000-0000-00000000000a';
  b constant uuid := '00000000-0000-0000-0000-00000000000b';
  facilitator constant uuid := '00000000-0000-0000-0000-00000000000c';
  learning constant uuid := '00000000-0000-0000-0000-00000000000d';
  mentor constant uuid := '00000000-0000-0000-0000-00000000000e';
  outsider constant uuid := '00000000-0000-0000-0000-00000000000f';
  st uuid;
  u uuid;
begin
  select id into st from pisga.mapping_statements where gate_number = 1 and sort_order = 1;

  -- ---- anonymous visitors -------------------------------------------------
  perform set_config('role', 'anon', true);
  perform tests.expect('anon cannot read sessions', tests.run('select 1 from pisga.sessions'), -1);
  perform tests.expect('anon cannot read memberships', tests.run('select 1 from pisga.app_memberships'), -1);

  -- ---- a user of another NGG app, without Pisga membership ----------------
  perform tests.act_as(outsider);
  perform tests.expect('non-member sees no sessions', tests.run('select 1 from pisga.sessions'), 0);
  perform tests.expect('non-member sees no gates', tests.run('select 1 from pisga.gates'), 0);
  perform tests.expect('non-member sees no memberships', tests.run('select 1 from pisga.app_memberships'), 0);
  perform tests.expect('non-member sees no stored files', tests.run('select 1 from storage.objects'), 0);
  perform tests.expect('non-member cannot write a mapping answer',
    tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score) values (%L, ''start'', %L, 3)', outsider, st)), -1);

  -- ---- shared content -----------------------------------------------------
  foreach u in array array[a, facilitator, learning, mentor] loop
    perform tests.act_as(u);
    perform tests.expect('member reads 12 sessions', tests.run('select 1 from pisga.sessions'), 12);
    perform tests.expect('member reads 7 gates', tests.run('select 1 from pisga.gates'), 7);
    perform tests.expect('member reads stored files', tests.run('select 1 from storage.objects'), 1);
    perform tests.expect('member reads only own membership', tests.run('select 1 from pisga.app_memberships'), 1);
    perform tests.expect('member reads only own profile', tests.run('select 1 from pisga.profiles'), 1);
  end loop;

  foreach u in array array[a, mentor] loop
    perform tests.act_as(u);
    perform tests.expect('participant/mentor cannot edit a session', tests.run('update pisga.sessions set location = ''x'' where number = 1'), 0);
    perform tests.expect('participant/mentor cannot add a speaker', tests.run('insert into pisga.session_speakers (session_number, name) values (1, ''x'')'), -1);
    perform tests.expect('participant/mentor cannot change settings', tests.run('update pisga.app_settings set value = ''true'' where key = ''mapping_published'''), 0);
    perform tests.expect('participant/mentor cannot edit a statement', tests.run('update pisga.mapping_statements set body = ''x'''), 0);
    perform tests.expect('participant/mentor cannot add a question', tests.run('insert into pisga.journal_questions (session_number, sort_order, body) values (3, 1, ''x'')'), -1);
    perform tests.expect('participant/mentor cannot upload a file', tests.run('insert into storage.objects (bucket_id, name) values (''pisga-materials'', ''x'')'), -1);
    perform tests.expect('participant/mentor cannot delete a file', tests.run('delete from storage.objects'), 0);
    perform tests.expect('participant/mentor cannot grant a membership',
      tests.run(format('insert into pisga.app_memberships (user_id, role) values (%L, ''ngg_facilitator'')', outsider)), -1);
    perform tests.expect('participant/mentor cannot change own role', tests.run('update pisga.app_memberships set role = ''ngg_facilitator'''), -1);
  end loop;

  foreach u in array array[facilitator, learning] loop
    perform tests.act_as(u);
    perform tests.expect('staff edits a session', tests.run('update pisga.sessions set location = ''x'' where number = 1'), 1);
    perform tests.expect('staff adds a speaker', tests.run('insert into pisga.session_speakers (session_number, name) values (1, ''x'')'), 1);
    perform tests.expect('staff uploads a file', tests.run('insert into storage.objects (bucket_id, name) values (''pisga-materials'', ''y'')'), 1);
    perform tests.expect('staff reads all journal questions', tests.run('select 1 from pisga.journal_questions'), 2);
    perform tests.expect('staff cannot change own role', tests.run('update pisga.app_memberships set role = ''participant'''), -1);
  end loop;

  -- ---- mapping questionnaire ---------------------------------------------
  perform tests.act_as(a);
  perform tests.expect('answer refused before the questionnaire is published',
    tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score) values (%L, ''start'', %L, 3)', a, st)), -1);

  perform tests.act_as(facilitator);
  perform tests.expect('staff publishes the questionnaire', tests.run('update pisga.app_settings set value = ''true'' where key = ''mapping_published'''), 1);

  perform tests.act_as(a);
  perform tests.expect('participant saves an answer',
    tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score) values (%L, ''start'', %L, 3)', a, st)), 1);
  perform tests.expect('participant changes an answer (upsert, as the app does)',
    tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score) values (%L, ''start'', %L, 5)
                      on conflict (user_id, round, statement_id) do update set score = excluded.score', a, st)), 1);
  perform tests.expect('participant cannot write an answer for someone else',
    tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score) values (%L, ''start'', %L, 3)', b, st)), -1);
  perform tests.expect('closing round refused before session 12',
    tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score) values (%L, ''end'', %L, 3)', a, st)), -1);
  perform tests.expect('round cannot be completed with answers missing',
    tests.run(format('insert into pisga.mapping_completions (user_id, round) values (%L, ''start'')', a)), -1);
  perform tests.expect('participant saves the remaining answers',
    tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score)
                      select %L, ''start'', id, 4 from pisga.mapping_statements where id <> %L', a, st)), 13);
  perform tests.expect('participant saves the open answer',
    tests.run(format('insert into pisga.mapping_open_answers (user_id, round, body) values (%L, ''start'', ''text'')', a)), 1);
  perform tests.expect('participant completes the round',
    tests.run(format('insert into pisga.mapping_completions (user_id, round) values (%L, ''start'')', a)), 1);
  perform tests.expect('answers are locked after completion',
    tests.run('update pisga.mapping_responses set score = 1'), -1);
  perform tests.expect('open answer is locked after completion',
    tests.run('update pisga.mapping_open_answers set body = ''changed'''), -1);
  perform tests.expect('upsert is refused after completion as well',
    tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score) values (%L, ''start'', %L, 1)
                      on conflict (user_id, round, statement_id) do update set score = excluded.score', a, st)), -1);
  perform tests.expect('participant cannot delete answers', tests.run('delete from pisga.mapping_responses'), -1);
  perform tests.expect('participant cannot undo completion', tests.run('delete from pisga.mapping_completions'), -1);
  perform tests.expect('participant reads own 14 answers', tests.run('select 1 from pisga.mapping_responses'), 14);

  foreach u in array array[b, facilitator, learning, mentor, outsider] loop
    perform tests.act_as(u);
    perform tests.expect('nobody else reads the mapping answers', tests.run('select 1 from pisga.mapping_responses'), 0);
    perform tests.expect('nobody else reads the open answer', tests.run('select 1 from pisga.mapping_open_answers'), 0);
    perform tests.expect('nobody else reads the completion', tests.run('select 1 from pisga.mapping_completions'), 0);
    perform tests.expect('nobody else can alter the mapping answers', tests.run('update pisga.mapping_responses set score = 1'), 0);
  end loop;

  foreach u in array array[facilitator, mentor] loop
    perform tests.act_as(u);
    perform tests.expect('staff/mentor cannot fill the questionnaire',
      tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score) values (%L, ''start'', %L, 3)', u, st)), -1);
  end loop;

  -- ---- journal: locked before the session date ---------------------------
  perform tests.act_as(a);
  perform tests.expect('questions hidden before the session date', tests.run('select 1 from pisga.journal_questions'), 0);
  perform tests.expect('entry refused before the session date',
    tests.run(format('insert into pisga.journal_entries (user_id, question_id, body) values (%L, ''10000000-0000-0000-0000-000000000001'', ''x'')', a)), -1);
  perform tests.expect('north star refused before the session date',
    tests.run(format('insert into pisga.north_star_versions (user_id, session_number, body) values (%L, 1, ''x'')', a)), -1);

  perform tests.act_as(mentor);
  perform tests.expect('mentor never reads journal questions', tests.run('select 1 from pisga.journal_questions'), 0);

  -- ---- journal: open from the session date -------------------------------
  perform tests.act_as(facilitator);
  perform tests.expect('staff sets session 1 to today',
    tests.run('update pisga.sessions set session_date = (now() at time zone ''Asia/Jerusalem'')::date where number = 1'), 1);
  perform tests.expect('staff sets session 2 to tomorrow',
    tests.run('update pisga.sessions set session_date = (now() at time zone ''Asia/Jerusalem'')::date + 1 where number = 2'), 1);

  perform tests.act_as(a);
  perform tests.expect('only the open session''s questions are visible', tests.run('select 1 from pisga.journal_questions'), 1);
  perform tests.expect('participant writes an entry',
    tests.run(format('insert into pisga.journal_entries (user_id, question_id, body) values (%L, ''10000000-0000-0000-0000-000000000001'', ''x'')', a)), 1);
  perform tests.expect('participant updates the entry', tests.run('update pisga.journal_entries set body = ''y'''), 1);
  perform tests.expect('participant re-saves the entry (upsert, as the app does)',
    tests.run(format('insert into pisga.journal_entries (user_id, question_id, body) values (%L, ''10000000-0000-0000-0000-000000000001'', ''z'')
                      on conflict (user_id, question_id) do update set body = excluded.body', a)), 1);
  perform tests.expect('entry for tomorrow''s session refused',
    tests.run(format('insert into pisga.journal_entries (user_id, question_id, body) values (%L, ''10000000-0000-0000-0000-000000000002'', ''x'')', a)), -1);
  perform tests.expect('participant cannot write an entry for someone else',
    tests.run(format('insert into pisga.journal_entries (user_id, question_id, body) values (%L, ''10000000-0000-0000-0000-000000000001'', ''x'')', b)), -1);
  perform tests.expect('participant writes the north star',
    tests.run(format('insert into pisga.north_star_versions (user_id, session_number, body) values (%L, 1, ''x'')', a)), 1);
  perform tests.expect('north star for tomorrow''s session refused',
    tests.run(format('insert into pisga.north_star_versions (user_id, session_number, body) values (%L, 2, ''x'')', a)), -1);
  perform tests.expect('participant keeps an advisor summary',
    tests.run(format('insert into pisga.advisor_summaries (user_id, summary) values (%L, ''x'')', a)), 1);

  foreach u in array array[b, facilitator, learning, mentor, outsider] loop
    perform tests.act_as(u);
    perform tests.expect('nobody else reads the journal', tests.run('select 1 from pisga.journal_entries'), 0);
    perform tests.expect('nobody else reads the north star', tests.run('select 1 from pisga.north_star_versions'), 0);
    perform tests.expect('nobody else reads the advisor summary', tests.run('select 1 from pisga.advisor_summaries'), 0);
    perform tests.expect('nobody else can alter the journal', tests.run('update pisga.journal_entries set body = ''z'''), 0);
  end loop;

  perform tests.act_as(facilitator);
  perform tests.expect('staff cannot write a journal entry',
    tests.run(format('insert into pisga.journal_entries (user_id, question_id, body) values (%L, ''10000000-0000-0000-0000-000000000001'', ''x'')', facilitator)), -1);

  -- ---- closing round of the mapping opens with session 12 ----------------
  perform tests.expect('staff sets session 12 to today',
    tests.run('update pisga.sessions set session_date = (now() at time zone ''Asia/Jerusalem'')::date where number = 12'), 1);
  perform tests.act_as(a);
  perform tests.expect('closing round accepted from session 12',
    tests.run(format('insert into pisga.mapping_responses (user_id, round, statement_id, score) values (%L, ''end'', %L, 5)', a, st)), 1);

  perform tests.act_as_owner();
end;
$$;

rollback;
drop schema tests cascade;
\echo 'All permission checks passed.'
