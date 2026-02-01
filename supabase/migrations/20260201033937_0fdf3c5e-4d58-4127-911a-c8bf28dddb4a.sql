-- Drop the existing status check constraint and add a new one that includes 'delivered'
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Add new check constraint with all valid statuses including 'delivered'
ALTER TABLE public.orders ADD CONSTRAINT orders_status_check 
  CHECK (status IN ('pending', 'preparing', 'ready', 'delivered', 'cancelled'));