-- Pisga companion app · file storage for session materials
-- A private bucket. Members download through short-lived signed URLs; staff upload and remove.

insert into storage.buckets (id, name, public)
values ('pisga-materials', 'pisga-materials', false)
on conflict (id) do nothing;

create policy "pisga materials: members read" on storage.objects
  for select to authenticated
  using (bucket_id = 'pisga-materials' and (select pisga_private.is_member()));

create policy "pisga materials: staff upload" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'pisga-materials' and (select pisga_private.is_staff()));

create policy "pisga materials: staff update" on storage.objects
  for update to authenticated
  using (bucket_id = 'pisga-materials' and (select pisga_private.is_staff()))
  with check (bucket_id = 'pisga-materials' and (select pisga_private.is_staff()));

create policy "pisga materials: staff delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'pisga-materials' and (select pisga_private.is_staff()));
