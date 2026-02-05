-- Add amount_paid column to track payments for balance calculation after edits
ALTER TABLE public.orders ADD COLUMN amount_paid numeric DEFAULT 0;

-- For existing paid orders, set amount_paid equal to total
UPDATE public.orders SET amount_paid = total WHERE payment_status = 'paid';