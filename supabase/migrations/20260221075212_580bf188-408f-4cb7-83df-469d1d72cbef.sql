-- Add columns to track split payment amounts
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS cash_amount numeric DEFAULT NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS card_amount numeric DEFAULT NULL;