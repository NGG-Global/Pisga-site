-- Pisga companion app · removal of all Pisga data at programme end
-- Read docs/data-deletion.md first. This script is destructive and cannot be undone.
-- It is deliberately split into steps; run them one at a time in the Supabase SQL editor.

-- STEP 1 · Review who will be affected. Keep the result with the deletion record.
select m.role, count(*) as accounts
from pisga.app_memberships m
group by m.role
order by m.role;

-- STEP 2 · List the accounts that belong to Pisga only.
-- The project is shared: an account that also belongs to another NGG app must NOT be deleted.
-- Extend the "not exists" conditions below with the membership table of every other app in
-- the project before trusting this list.
select u.id, u.email
from auth.users u
join pisga.app_memberships m on m.user_id = u.id
-- where not exists (select 1 from <other_app_schema>.app_memberships o where o.user_id = u.id)
order by u.email;

-- STEP 3 · Delete the stored files.
-- Remove every object of the bucket `pisga-materials` and then the bucket itself from the
-- dashboard (Storage) or the Storage API. Supabase does not support deleting storage objects
-- with SQL.

-- STEP 4 · Delete the Pisga-only accounts found in step 2 from the dashboard
-- (Authentication > Users) or with the admin API. Do this BEFORE step 5, while the membership
-- table still identifies them.

-- STEP 5 · Remove all Pisga tables, policies and functions.
-- drop policy "pisga materials: members read" on storage.objects;
-- drop policy "pisga materials: staff upload" on storage.objects;
-- drop policy "pisga materials: staff update" on storage.objects;
-- drop policy "pisga materials: staff delete" on storage.objects;
-- drop schema pisga cascade;
-- drop schema pisga_private cascade;

-- STEP 6 · Verify. Both queries must return zero rows.
-- select schema_name from information_schema.schemata where schema_name in ('pisga', 'pisga_private');
-- select policyname from pg_policies where policyname like 'pisga materials:%';
