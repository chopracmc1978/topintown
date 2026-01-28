-- Create a new global_sauces table for sauces that can be used across all pizzas
CREATE TABLE public.global_sauces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.global_sauces ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage global sauces"
ON public.global_sauces
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view available global sauces"
ON public.global_sauces
FOR SELECT
USING (is_available = true);

-- Insert the default sauces
INSERT INTO public.global_sauces (name, price, sort_order) VALUES
  ('Hearty Marinara Sauce', 0, 1),
  ('Butter Chicken Sauce', 0, 2),
  ('Creamy Garlic Sauce', 0, 3),
  ('Ranch Sauce', 0, 4),
  ('Donair Sauce', 0, 5),
  ('Shahi Sauce', 0, 6),
  ('BBQ Sauce', 0, 7);