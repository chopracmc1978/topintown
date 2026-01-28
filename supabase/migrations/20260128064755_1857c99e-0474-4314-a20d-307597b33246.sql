-- Create enum for spicy levels
CREATE TYPE public.spicy_level AS ENUM ('none', 'mild', 'medium', 'hot');

-- Create sauce_groups table for configuring sauce selection per menu item
CREATE TABLE public.sauce_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL DEFAULT 'Sauce',
  min_selection integer NOT NULL DEFAULT 0,
  max_selection integer NOT NULL DEFAULT 1,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create sauce_options table for sauces within a group
CREATE TABLE public.sauce_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sauce_group_id uuid REFERENCES public.sauce_groups(id) ON DELETE CASCADE NOT NULL,
  name text NOT NULL,
  is_free boolean NOT NULL DEFAULT false,
  price numeric NOT NULL DEFAULT 0,
  has_spicy_option boolean NOT NULL DEFAULT false,
  is_available boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.sauce_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sauce_options ENABLE ROW LEVEL SECURITY;

-- RLS policies for sauce_groups
CREATE POLICY "Anyone can view sauce groups" 
ON public.sauce_groups 
FOR SELECT 
USING (true);

CREATE POLICY "Admins can manage sauce groups" 
ON public.sauce_groups 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- RLS policies for sauce_options
CREATE POLICY "Anyone can view available sauce options" 
ON public.sauce_options 
FOR SELECT 
USING (is_available = true);

CREATE POLICY "Admins can manage sauce options" 
ON public.sauce_options 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));