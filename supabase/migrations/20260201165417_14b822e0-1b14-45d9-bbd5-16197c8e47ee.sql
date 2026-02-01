-- Create table for location operating hours (per day of week)
CREATE TABLE public.location_hours (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id text NOT NULL,
  day_of_week integer NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0 = Sunday, 6 = Saturday
  is_open boolean NOT NULL DEFAULT true,
  open_time time NOT NULL DEFAULT '11:00:00',
  close_time time NOT NULL DEFAULT '22:00:00',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (location_id, day_of_week)
);

-- Enable RLS
ALTER TABLE public.location_hours ENABLE ROW LEVEL SECURITY;

-- Anyone can view location hours
CREATE POLICY "Anyone can view location hours" 
ON public.location_hours 
FOR SELECT 
USING (true);

-- Admins can manage location hours
CREATE POLICY "Admins can manage location hours" 
ON public.location_hours 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Create table for thermal printers
CREATE TABLE public.printers (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id text NOT NULL,
  name text NOT NULL,
  ip_address text NOT NULL,
  station text NOT NULL DEFAULT 'Kitchen', -- Kitchen, Bar, Counter, etc.
  paper_width integer NOT NULL DEFAULT 80, -- 58mm or 80mm
  auto_cut boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.printers ENABLE ROW LEVEL SECURITY;

-- Admins/Staff can view printers for their location
CREATE POLICY "Staff can view printers" 
ON public.printers 
FOR SELECT 
USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Admins can manage printers
CREATE POLICY "Admins can manage printers" 
ON public.printers 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add pickup_time column to orders for advance ordering
ALTER TABLE public.orders 
ADD COLUMN pickup_time timestamp with time zone NULL;

-- Seed default hours for both locations (Mon-Sun, 11am-10pm)
INSERT INTO public.location_hours (location_id, day_of_week, is_open, open_time, close_time)
SELECT loc, dow, true, '11:00:00'::time, '22:00:00'::time
FROM (VALUES ('calgary'), ('chestermere')) AS locations(loc)
CROSS JOIN generate_series(0, 6) AS dow
ON CONFLICT (location_id, day_of_week) DO NOTHING;