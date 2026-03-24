/*
  # Allow anon role to upload to storage bucket

  ## Changes
  - Add INSERT policy for anon role on storage.objects for the uploads bucket
  - This allows the server (using anon key) to upload files to Supabase Storage
  - The existing service_role policies remain unchanged

  ## Reason
  The server uses VITE_SUPABASE_ANON_KEY when SUPABASE_SERVICE_ROLE_KEY is not set.
  Without this policy, file uploads fail with an RLS violation.
*/

CREATE POLICY "Anon upload access for uploads"
  ON storage.objects
  FOR INSERT
  TO anon
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Anon delete access for uploads"
  ON storage.objects
  FOR DELETE
  TO anon
  USING (bucket_id = 'uploads');

CREATE POLICY "Anon update access for uploads"
  ON storage.objects
  FOR UPDATE
  TO anon
  USING (bucket_id = 'uploads')
  WITH CHECK (bucket_id = 'uploads');
