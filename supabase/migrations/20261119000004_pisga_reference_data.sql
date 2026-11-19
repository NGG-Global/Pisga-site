-- Pisga companion app · reference data known at hand-off
-- Only content that was supplied is inserted. Everything else (titles, dates, locations,
-- speakers, the remaining mapping statements, reflection questions, advisor texts) is
-- entered by staff through the content-management screens.

insert into pisga.gates (number, title) values
  (1, 'זהות מנהיגותית לעתיד'),
  (2, 'ראייה מערכתית 2035'),
  (3, 'מנהיגות רבודה (בעידן ה־AI)'),
  (4, 'ניווט באי־ודאות'),
  (5, 'עיצוב מחדש'),
  (6, 'השפעה ורישות'),
  (7, 'כישורי העתיד')
on conflict (number) do nothing;

insert into pisga.sessions (number) select generate_series(1, 12) on conflict (number) do nothing;

update pisga.sessions set title = 'Leaving Gravity', session_date = date '2026-12-30', gate_number = 1
where number = 1 and title is null;
update pisga.sessions set title = 'Leaving Gravity · ODT', gate_number = 1
where number = 2 and title is null;

insert into pisga.mapping_statements (gate_number, sort_order, body) values
  (1, 1, 'אני מאתגר/ת ומעדכן/ת את דרכי ההובלה שלי בהתאם לראייה עתידית.'),
  (1, 2, 'אני מעצב/ת את הזהות המנהיגותית שלי לנוכח אתגרי העתיד, ולא רק לנוכח התפקיד הנוכחי.')
on conflict (gate_number, sort_order) do nothing;

insert into pisga.app_settings (key, value) values
  ('mapping_published', 'false'::jsonb),
  ('mapping_open_question', '""'::jsonb),
  ('advisor_enabled', 'false'::jsonb),
  ('advisor_opening_message', '""'::jsonb),
  ('advisor_suggested_questions', '[]'::jsonb)
on conflict (key) do nothing;
