-- Add order column to videos table
ALTER TABLE public.videos 
ADD COLUMN display_order INTEGER;

-- Set initial order based on created_at (oldest = 1, newest = last)
UPDATE public.videos 
SET display_order = subquery.row_num
FROM (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM public.videos
) AS subquery
WHERE public.videos.id = subquery.id;