-- Add is_veg column to toppings table
ALTER TABLE public.toppings 
ADD COLUMN is_veg boolean NOT NULL DEFAULT true;