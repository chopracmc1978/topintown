-- Store full checkout payloads server-side (avoid Stripe metadata 500-char limits)
CREATE TABLE IF NOT EXISTS public.checkout_drafts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone NOT NULL DEFAULT (now() + interval '2 days'),
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  payload jsonb NOT NULL
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_checkout_drafts_created_at ON public.checkout_drafts (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_checkout_drafts_expires_at ON public.checkout_drafts (expires_at);
CREATE UNIQUE INDEX IF NOT EXISTS ux_checkout_drafts_stripe_session_id ON public.checkout_drafts (stripe_session_id) WHERE stripe_session_id IS NOT NULL;

-- Lock down drafts from public client access; only backend functions should read/write.
ALTER TABLE public.checkout_drafts ENABLE ROW LEVEL SECURITY;