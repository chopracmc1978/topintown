
-- Create locations table
CREATE TABLE public.locations (
  id text PRIMARY KEY,
  name text NOT NULL,
  short_name text NOT NULL,
  address text NOT NULL,
  city text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  lat numeric NOT NULL DEFAULT 0,
  lng numeric NOT NULL DEFAULT 0,
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Anyone can view active locations
CREATE POLICY "Anyone can view active locations"
ON public.locations FOR SELECT
USING (is_active = true);

-- Admins can manage locations
CREATE POLICY "Admins can manage locations"
ON public.locations FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed existing locations
INSERT INTO public.locations (id, name, short_name, address, city, phone, lat, lng, sort_order) VALUES
('calgary', 'Top In Town Pizza - Calgary', 'Calgary', '3250 60 ST NE', 'Calgary, AB', '(403) 280-7373 ext 1', 51.0855, -113.9577, 0),
('chestermere', 'Top In Town Pizza - Kinniburgh', 'Chestermere', '272 Kinniburgh Blvd unit 103', 'Chestermere, AB', '(403) 280-7373 ext 2', 51.0501, -113.8227, 1);

-- Create storage bucket for location images
INSERT INTO storage.buckets (id, name, public) VALUES ('location-images', 'location-images', true);

-- Storage policies for location images
CREATE POLICY "Anyone can view location images"
ON storage.objects FOR SELECT
USING (bucket_id = 'location-images');

CREATE POLICY "Admins can upload location images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'location-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update location images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'location-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Admins can delete location images"
ON storage.objects FOR DELETE
USING (bucket_id = 'location-images' AND auth.uid() IS NOT NULL);
