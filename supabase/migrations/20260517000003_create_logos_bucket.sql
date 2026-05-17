-- Create logos storage bucket (public, 5 MB limit)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'logos',
  'logos',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Public read (logo images are public)
DROP POLICY IF EXISTS "logos_public_read" ON storage.objects;
CREATE POLICY "logos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'logos');

-- Authenticated users can upload
DROP POLICY IF EXISTS "logos_auth_insert" ON storage.objects;
CREATE POLICY "logos_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Authenticated users can replace their logo
DROP POLICY IF EXISTS "logos_auth_update" ON storage.objects;
CREATE POLICY "logos_auth_update"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'logos' AND auth.role() = 'authenticated');

-- Authenticated users can delete
DROP POLICY IF EXISTS "logos_auth_delete" ON storage.objects;
CREATE POLICY "logos_auth_delete"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'logos' AND auth.role() = 'authenticated');
