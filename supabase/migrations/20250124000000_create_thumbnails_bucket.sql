-- Create thumbnails storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'thumbnails',
  'thumbnails',
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp']
);

-- Create policy for public access to thumbnails
CREATE POLICY "Public Access" ON storage.objects
FOR SELECT USING (bucket_id = 'thumbnails');

-- Create policy for authenticated users to upload thumbnails
CREATE POLICY "Authenticated users can upload thumbnails" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'thumbnails' 
  AND auth.role() = 'authenticated'
);

-- Create policy for authenticated users to update thumbnails
CREATE POLICY "Authenticated users can update thumbnails" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'thumbnails' 
  AND auth.role() = 'authenticated'
);

-- Create policy for authenticated users to delete thumbnails
CREATE POLICY "Authenticated users can delete thumbnails" ON storage.objects
FOR DELETE USING (
  bucket_id = 'thumbnails' 
  AND auth.role() = 'authenticated'
);
