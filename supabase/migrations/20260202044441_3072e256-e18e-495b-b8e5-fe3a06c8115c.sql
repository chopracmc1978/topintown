-- Create promotions table for dynamic combo deals
CREATE TABLE public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  subtitle text,
  description text,
  price numeric NOT NULL,
  price_suffix text DEFAULT '',
  coupon_code text,
  image_url text,
  background_color text DEFAULT '#dc2626',
  text_color text DEFAULT '#ffffff',
  badge_text text,
  layout text DEFAULT 'horizontal' CHECK (layout IN ('horizontal', 'card', 'featured')),
  show_order_button boolean DEFAULT true,
  is_active boolean DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Admins can manage promotions
CREATE POLICY "Admins can manage promotions"
ON public.promotions
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Anyone can view active promotions
CREATE POLICY "Anyone can view active promotions"
ON public.promotions
FOR SELECT
USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_promotions_updated_at
  BEFORE UPDATE ON public.promotions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create storage bucket for promotion images
INSERT INTO storage.buckets (id, name, public)
VALUES ('promotion-images', 'promotion-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to promotion images
CREATE POLICY "Public can view promotion images"
ON storage.objects FOR SELECT
USING (bucket_id = 'promotion-images');

-- Allow admins to upload/delete promotion images
CREATE POLICY "Admins can upload promotion images"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'promotion-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update promotion images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'promotion-images' AND has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete promotion images"
ON storage.objects FOR DELETE
USING (bucket_id = 'promotion-images' AND has_role(auth.uid(), 'admin'));