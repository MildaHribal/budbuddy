-- remove() needs SELECT on the user's own objects
create policy "media select own" on storage.objects for select to authenticated
  using (bucket_id = 'media' and ((storage.foldername(name))[1] = auth.uid()::text or private.is_admin()));
