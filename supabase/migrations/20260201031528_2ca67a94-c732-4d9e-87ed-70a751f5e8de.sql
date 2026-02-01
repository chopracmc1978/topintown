-- Add source column to track where orders come from
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'web';

-- Add order_type column for pickup/delivery/dine-in
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS order_type text NOT NULL DEFAULT 'pickup';

-- Add payment_status column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unpaid';

-- Add payment_method column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS payment_method text;

-- Add customer_name column for walk-in orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_name text;

-- Add customer_phone column
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_phone text;

-- Add customer_address column for delivery
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS customer_address text;

-- Add table_number for dine-in orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS table_number text;

-- Enable realtime for orders table
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;