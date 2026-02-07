-- Add attempt tracking column to otp_codes for rate limiting
ALTER TABLE public.otp_codes ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;