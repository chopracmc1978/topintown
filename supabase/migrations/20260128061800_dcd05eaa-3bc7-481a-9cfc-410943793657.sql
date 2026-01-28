-- Add username column to profiles
ALTER TABLE public.profiles ADD COLUMN username TEXT UNIQUE;

-- Create index for username lookups
CREATE INDEX idx_profiles_username ON public.profiles(username);