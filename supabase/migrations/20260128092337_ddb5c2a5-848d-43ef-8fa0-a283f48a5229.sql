-- Add new category values to the menu_category enum
ALTER TYPE menu_category ADD VALUE IF NOT EXISTS 'chicken_wings';
ALTER TYPE menu_category ADD VALUE IF NOT EXISTS 'baked_lasagna';