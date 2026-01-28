-- Create category type enum
CREATE TYPE public.menu_category AS ENUM ('pizza', 'sides', 'drinks', 'desserts', 'dipping_sauce');

-- Create menu_items table
CREATE TABLE public.menu_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  base_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  image_url TEXT,
  category menu_category NOT NULL,
  is_available BOOLEAN NOT NULL DEFAULT true,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create item_sizes table for pizza/item sizes
CREATE TABLE public.item_sizes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create toppings table
CREATE TABLE public.toppings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create item_default_toppings junction table
CREATE TABLE public.item_default_toppings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  topping_id UUID NOT NULL REFERENCES public.toppings(id) ON DELETE CASCADE,
  is_removable BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, topping_id)
);

-- Enable RLS on all tables
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_sizes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.toppings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.item_default_toppings ENABLE ROW LEVEL SECURITY;

-- Public read policies (customers can view menu)
CREATE POLICY "Anyone can view available menu items"
  ON public.menu_items FOR SELECT
  USING (is_available = true);

CREATE POLICY "Anyone can view item sizes"
  ON public.item_sizes FOR SELECT
  USING (true);

CREATE POLICY "Anyone can view available toppings"
  ON public.toppings FOR SELECT
  USING (is_available = true);

CREATE POLICY "Anyone can view item default toppings"
  ON public.item_default_toppings FOR SELECT
  USING (true);

-- Create user_roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');

CREATE TABLE public.user_roles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Admin policies for menu management
CREATE POLICY "Admins can manage menu items"
  ON public.menu_items FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage item sizes"
  ON public.item_sizes FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage toppings"
  ON public.toppings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage item default toppings"
  ON public.item_default_toppings FOR ALL
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Users can view their own roles
CREATE POLICY "Users can view own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Add triggers for updated_at
CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_toppings_updated_at
  BEFORE UPDATE ON public.toppings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();