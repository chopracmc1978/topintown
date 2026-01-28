-- Create crust_options table
CREATE TABLE public.crust_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create size-crust availability junction table
CREATE TABLE public.size_crust_availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  size_name TEXT NOT NULL, -- 'Small', 'Medium', 'Large'
  crust_id UUID NOT NULL REFERENCES public.crust_options(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(size_name, crust_id)
);

-- Create cheese_options table
CREATE TABLE public.cheese_options (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price_regular NUMERIC NOT NULL DEFAULT 0,
  price_extra NUMERIC NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create free_toppings table (optional free add-ons)
CREATE TABLE public.free_toppings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add quantity enum for toppings
CREATE TYPE public.topping_quantity AS ENUM ('none', 'less', 'regular', 'extra');

-- Add sauce quantity enum
CREATE TYPE public.sauce_quantity AS ENUM ('regular', 'extra');

-- Enable RLS
ALTER TABLE public.crust_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.size_crust_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cheese_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.free_toppings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for crust_options
CREATE POLICY "Anyone can view available crusts" ON public.crust_options
  FOR SELECT USING (is_available = true);

CREATE POLICY "Admins can manage crusts" ON public.crust_options
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for size_crust_availability
CREATE POLICY "Anyone can view size crust availability" ON public.size_crust_availability
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage size crust availability" ON public.size_crust_availability
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for cheese_options
CREATE POLICY "Anyone can view available cheese" ON public.cheese_options
  FOR SELECT USING (is_available = true);

CREATE POLICY "Admins can manage cheese" ON public.cheese_options
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- RLS Policies for free_toppings
CREATE POLICY "Anyone can view available free toppings" ON public.free_toppings
  FOR SELECT USING (is_available = true);

CREATE POLICY "Admins can manage free toppings" ON public.free_toppings
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default crust options
INSERT INTO public.crust_options (name, sort_order) VALUES
  ('Regular', 1),
  ('Gluten Free', 2);

-- Insert size-crust availability (Small/Large = Regular only, Medium = Regular + Gluten Free)
INSERT INTO public.size_crust_availability (size_name, crust_id)
SELECT 'Small', id FROM public.crust_options WHERE name = 'Regular'
UNION ALL
SELECT 'Medium', id FROM public.crust_options WHERE name = 'Regular'
UNION ALL
SELECT 'Medium', id FROM public.crust_options WHERE name = 'Gluten Free'
UNION ALL
SELECT 'Large', id FROM public.crust_options WHERE name = 'Regular';

-- Insert default cheese options
INSERT INTO public.cheese_options (name, is_default, price_extra, sort_order) VALUES
  ('Mozzarella', true, 2.00, 1),
  ('Dairy Free', false, 2.50, 2);

-- Insert free toppings
INSERT INTO public.free_toppings (name, sort_order) VALUES
  ('Fresh Cilantro', 1),
  ('Ginger', 2),
  ('Fresh Garlic', 3);

-- Insert default sauces into a default sauce group (we'll create one for pizzas)
-- First get or create a pizza item to link sauces
INSERT INTO public.sauce_options (sauce_group_id, name, is_free, has_spicy_option, sort_order)
SELECT 
  (SELECT id FROM public.sauce_groups LIMIT 1),
  sauce_name,
  false,
  false,
  row_number
FROM (
  VALUES 
    ('Hearty Marinara Sauce', 1),
    ('Butter Chicken Sauce', 2),
    ('Creamy Garlic Sauce', 3),
    ('Ranch Sauce', 4),
    ('Donair Sauce', 5),
    ('Shahi Sauce', 6),
    ('BBQ Sauce', 7)
) AS sauces(sauce_name, row_number)
WHERE EXISTS (SELECT 1 FROM public.sauce_groups LIMIT 1);