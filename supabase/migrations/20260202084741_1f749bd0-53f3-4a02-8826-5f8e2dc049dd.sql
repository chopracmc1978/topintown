-- Create combos table
CREATE TABLE public.combos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  image_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  schedule_type TEXT DEFAULT 'always',
  schedule_days INTEGER[],
  schedule_dates INTEGER[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create combo items table (defines what items are in a combo)
CREATE TABLE public.combo_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  combo_id UUID NOT NULL REFERENCES public.combos(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL, -- 'pizza', 'wings', 'drinks', 'dipping_sauce'
  quantity INTEGER NOT NULL DEFAULT 1,
  size_restriction TEXT, -- e.g., 'Large 14"' for pizzas, '2 Litre' for drinks
  is_required BOOLEAN NOT NULL DEFAULT true,
  is_chargeable BOOLEAN NOT NULL DEFAULT false, -- if true, item cost is added to combo price
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.combos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.combo_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for combos
CREATE POLICY "Admins can manage combos" ON public.combos
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active combos" ON public.combos
  FOR SELECT USING (is_active = true);

-- RLS policies for combo_items
CREATE POLICY "Admins can manage combo items" ON public.combo_items
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view combo items" ON public.combo_items
  FOR SELECT USING (true);

-- Insert the Family Special Combo as an example
INSERT INTO public.combos (name, description, price, is_active) 
VALUES ('Family Special Combo', 'Any 2 Large Pizzas + 24 Wings + 2L Drink', 64.99, true);

-- Get the combo ID and insert items
INSERT INTO public.combo_items (combo_id, item_type, quantity, size_restriction, is_required, is_chargeable, sort_order)
SELECT id, 'pizza', 2, 'Large 14"', true, false, 1 FROM public.combos WHERE name = 'Family Special Combo'
UNION ALL
SELECT id, 'wings', 1, '24 Pieces', true, false, 2 FROM public.combos WHERE name = 'Family Special Combo'
UNION ALL
SELECT id, 'drinks', 1, '2 Litre', true, false, 3 FROM public.combos WHERE name = 'Family Special Combo'
UNION ALL
SELECT id, 'dipping_sauce', 1, NULL, false, true, 4 FROM public.combos WHERE name = 'Family Special Combo';