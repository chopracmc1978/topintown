-- Create a new table to link menu items to global sauces as defaults
CREATE TABLE public.item_default_global_sauces (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  global_sauce_id uuid NOT NULL REFERENCES public.global_sauces(id) ON DELETE CASCADE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, global_sauce_id)
);

-- Enable RLS
ALTER TABLE public.item_default_global_sauces ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage item default global sauces"
ON public.item_default_global_sauces
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view item default global sauces"
ON public.item_default_global_sauces
FOR SELECT
USING (true);