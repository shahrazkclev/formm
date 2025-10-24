-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Authenticated users can manage videos" ON public.videos;

-- Create new policies allowing public access for all operations
CREATE POLICY "Anyone can insert videos"
ON public.videos
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "Anyone can update videos"
ON public.videos
FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

CREATE POLICY "Anyone can delete videos"
ON public.videos
FOR DELETE
TO public
USING (true);