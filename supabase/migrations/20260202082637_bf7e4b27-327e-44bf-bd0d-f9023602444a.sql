-- Add scheduling columns to coupons table
ALTER TABLE public.coupons 
ADD COLUMN IF NOT EXISTS schedule_type text DEFAULT 'always',
ADD COLUMN IF NOT EXISTS schedule_days integer[] DEFAULT NULL,
ADD COLUMN IF NOT EXISTS schedule_dates integer[] DEFAULT NULL;