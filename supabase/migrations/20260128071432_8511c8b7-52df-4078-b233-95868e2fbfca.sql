
-- Create a default sauce group for all pizzas (we'll use a special "default" menu item id placeholder)
-- First, create a general sauce group that can be referenced
INSERT INTO sauce_groups (id, menu_item_id, name, min_selection, max_selection, sort_order) 
SELECT 
  '00000000-0000-0000-0000-000000000001'::uuid,
  id,
  'Default Sauces',
  0,
  5,
  0
FROM menu_items 
WHERE category = 'pizza'
LIMIT 1
ON CONFLICT DO NOTHING;

-- Insert all 7 sauces with the first pizza's sauce group
INSERT INTO sauce_options (sauce_group_id, name, is_free, price, has_spicy_option, is_available, sort_order) 
SELECT 
  sg.id,
  sauce.name,
  false,
  1.50,
  false,
  true,
  sauce.sort_order
FROM sauce_groups sg
CROSS JOIN (
  VALUES 
    ('Hearty Marinara Sauce', 1),
    ('Butter Chicken Sauce', 2),
    ('Creamy Garlic Sauce', 3),
    ('Ranch Sauce', 4),
    ('Donair Sauce', 5),
    ('Shahi Sauce', 6),
    ('BBQ Sauce', 7)
) AS sauce(name, sort_order)
WHERE sg.name = 'Default Sauces'
ON CONFLICT DO NOTHING;

-- Create table for pizza default sauces (linking menu items to their default sauces)
CREATE TABLE IF NOT EXISTS item_default_sauces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  sauce_option_id uuid NOT NULL REFERENCES sauce_options(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(menu_item_id, sauce_option_id)
);

-- Enable RLS
ALTER TABLE item_default_sauces ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Anyone can view item default sauces" 
  ON item_default_sauces FOR SELECT 
  USING (true);

CREATE POLICY "Admins can manage item default sauces" 
  ON item_default_sauces FOR ALL 
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));
