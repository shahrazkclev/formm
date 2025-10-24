-- Create thumbnails storage bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('thumbnails', 'thumbnails', true);

-- Create policy to allow anyone to view thumbnails (since bucket is public)
CREATE POLICY "Anyone can view thumbnails"
ON storage.objects
FOR SELECT
USING (bucket_id = 'thumbnails');

-- Create policy to allow anyone to upload thumbnails
CREATE POLICY "Anyone can upload thumbnails"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'thumbnails');

-- Create policy to allow anyone to update thumbnails
CREATE POLICY "Anyone can update thumbnails"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'thumbnails');

-- Create policy to allow anyone to delete thumbnails
CREATE POLICY "Anyone can delete thumbnails"
ON storage.objects
FOR DELETE
USING (bucket_id = 'thumbnails');