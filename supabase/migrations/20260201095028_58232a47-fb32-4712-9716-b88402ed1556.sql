-- Add Stripe session tracking for idempotent order finalization
ALTER TABLE public.orders
ADD COLUMN IF NOT EXISTS stripe_session_id text;

-- Prevent duplicate finalization for the same Stripe Checkout session
CREATE UNIQUE INDEX IF NOT EXISTS orders_stripe_session_id_unique_idx
ON public.orders (stripe_session_id)
WHERE stripe_session_id IS NOT NULL;