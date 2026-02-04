-- Add port column to printers table for custom port configuration
ALTER TABLE public.printers ADD COLUMN IF NOT EXISTS port integer NOT NULL DEFAULT 9100;