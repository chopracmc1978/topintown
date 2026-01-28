-- Add subcategory column for pizza classification
ALTER TABLE public.menu_items 
ADD COLUMN subcategory text;

-- Add comment for clarity
COMMENT ON COLUMN public.menu_items.subcategory IS 'Pizza subcategory: Vegetarian, Paneer, Chicken, Meat, Hawaiian';