-- CARATFLIX — avatar photo storage (Supabase Storage)
-- ---------------------------------------------------------------------------
-- Run this once, after 0001_init.sql, in your Supabase project:
--   Dashboard -> SQL Editor -> New query -> paste -> Run
-- (or `supabase db push` if you use the Supabase CLI).
--
-- It is idempotent, so re-running it is safe.
--
-- What it does:
--   * creates the public "avatars" bucket that holds uploaded profile photos
--   * caps uploads at 5 MB and to PNG / JPEG / WebP, matching the client-side
--     validation in src/utils/avatarUpload.js (defence in depth)
--   * lets anyone read avatars (they are profile pictures, shown to everyone)
--   * lets a signed-in user write only inside their own "{user id}/" folder, so
--     no one can overwrite or delete another account's photo
--
-- Objects are stored as "{accountId}/{profileId}-{timestamp}.webp". RLS reads
-- the first path segment with storage.foldername(name)[1] and compares it to
-- auth.uid() — the same id the app uses as `accountId`.

-- ---------------------------------------------------------------------------
-- Bucket
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880, -- 5 MB
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- Policies on storage.objects
-- ---------------------------------------------------------------------------
-- Read: everyone (the bucket is public; this also covers authenticated reads).
drop policy if exists "avatars: public read" on storage.objects;
create policy "avatars: public read" on storage.objects
  for select
  using (bucket_id = 'avatars');

-- Insert: signed-in users, only inside their own {auth.uid()}/ folder.
drop policy if exists "avatars: owner insert" on storage.objects;
create policy "avatars: owner insert" on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Update (replacing a file in place): same folder rule.
drop policy if exists "avatars: owner update" on storage.objects;
create policy "avatars: owner update" on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete (the app removes the previous photo after a successful upload).
drop policy if exists "avatars: owner delete" on storage.objects;
create policy "avatars: owner delete" on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
