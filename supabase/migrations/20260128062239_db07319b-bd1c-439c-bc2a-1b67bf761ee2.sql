-- Add size-based pricing to toppings
ALTER TABLE public.toppings 
ADD COLUMN price_small NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN price_medium NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN price_large NUMERIC NOT NULL DEFAULT 0;

-- Migrate existing price to all sizes
UPDATE public.toppings SET 
  price_small = price,
  price_medium = price,
  price_large = price;