
-- Create pos_staff table for location-specific staff (cashiers, managers)
CREATE TABLE public.pos_staff (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id text NOT NULL,
  name text NOT NULL,
  pin text NOT NULL,
  role text NOT NULL DEFAULT 'cashier',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Add unique constraint: one PIN per location
ALTER TABLE public.pos_staff ADD CONSTRAINT pos_staff_location_pin_unique UNIQUE (location_id, pin);

-- Enable RLS
ALTER TABLE public.pos_staff ENABLE ROW LEVEL SECURITY;

-- Staff and admins can view pos_staff at any location
CREATE POLICY "Staff can view pos staff"
ON public.pos_staff
FOR SELECT
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Staff and admins can create pos_staff
CREATE POLICY "Staff can insert pos staff"
ON public.pos_staff
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Staff and admins can update pos_staff
CREATE POLICY "Staff can update pos staff"
ON public.pos_staff
FOR UPDATE
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Staff and admins can delete pos_staff
CREATE POLICY "Staff can delete pos staff"
ON public.pos_staff
FOR DELETE
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

-- Add pos_staff_id column to pos_sessions to track which staff member is logged in
ALTER TABLE public.pos_sessions ADD COLUMN pos_staff_id uuid REFERENCES public.pos_staff(id);

-- Add pos_staff_id column to orders to track which cashier created/handled the order
ALTER TABLE public.orders ADD COLUMN pos_staff_id uuid REFERENCES public.pos_staff(id);

-- Create updated_at trigger for pos_staff
CREATE TRIGGER update_pos_staff_updated_at
BEFORE UPDATE ON public.pos_staff
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
