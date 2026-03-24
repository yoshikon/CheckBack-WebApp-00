/*
  # Create Supabase Storage bucket for uploaded files

  1. Creates a 'uploads' storage bucket for persistent file storage
  2. Sets bucket to public so files can be accessed via URL
  3. Adds RLS policies to allow authenticated and service-role access
*/

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'uploads',
  'uploads',
  true,
  209715200,
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 209715200;

CREATE POLICY "Public read access for uploads"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'uploads');

CREATE POLICY "Service role full access for uploads"
  ON storage.objects FOR INSERT
  TO service_role
  WITH CHECK (bucket_id = 'uploads');

CREATE POLICY "Service role update for uploads"
  ON storage.objects FOR UPDATE
  TO service_role
  USING (bucket_id = 'uploads');

CREATE POLICY "Service role delete for uploads"
  ON storage.objects FOR DELETE
  TO service_role
  USING (bucket_id = 'uploads');
