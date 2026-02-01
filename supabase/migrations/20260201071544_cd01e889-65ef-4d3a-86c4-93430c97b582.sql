-- Add location_id to profiles to associate users with stores
ALTER TABLE public.profiles 
ADD COLUMN location_id text DEFAULT NULL;

-- Create index for faster lookups
CREATE INDEX idx_profiles_location_id ON public.profiles(location_id);