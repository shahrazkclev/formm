-- Create videos table to store Cloudflare Stream video metadata
CREATE TABLE public.videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  uid TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  stream_url TEXT NOT NULL,
  thumbnail_url TEXT,
  size BIGINT DEFAULT 0,
  duration NUMERIC DEFAULT 0,
  status TEXT DEFAULT 'unknown',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.videos ENABLE ROW LEVEL SECURITY;

-- Public read access (anyone can view videos)
CREATE POLICY "Anyone can view videos"
ON public.videos
FOR SELECT
USING (true);

-- Only authenticated users can insert/update/delete (admin-level operations)
CREATE POLICY "Authenticated users can manage videos"
ON public.videos
FOR ALL
USING (auth.uid() IS NOT NULL);

-- Add updated_at trigger
CREATE OR REPLACE FUNCTION public.handle_videos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER update_videos_updated_at
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_videos_updated_at();

-- Create index for faster lookups
CREATE INDEX idx_videos_uid ON public.videos(uid);
CREATE INDEX idx_videos_created_at ON public.videos(created_at DESC);