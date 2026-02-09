-- Add settings_pin column to profiles table
ALTER TABLE public.profiles ADD COLUMN settings_pin text DEFAULT NULL;