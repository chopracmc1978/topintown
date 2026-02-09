
-- Add new jsonb column for per-location settings pins
ALTER TABLE public.profiles ADD COLUMN settings_pins jsonb DEFAULT NULL;

-- Migrate existing single pin data to the new jsonb format (apply to all locations)
UPDATE public.profiles
SET settings_pins = jsonb_build_object('calgary', settings_pin, 'chestermere', settings_pin)
WHERE settings_pin IS NOT NULL AND settings_pin != '';

-- Drop old single pin column
ALTER TABLE public.profiles DROP COLUMN settings_pin;
