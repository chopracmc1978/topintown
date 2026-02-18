
-- Create reward_settings table (singleton per location or global)
CREATE TABLE public.reward_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  is_enabled boolean NOT NULL DEFAULT true,
  dollars_per_point integer NOT NULL DEFAULT 2,
  points_per_dollar integer NOT NULL DEFAULT 10,
  min_points_to_redeem integer NOT NULL DEFAULT 200,
  max_points_per_order integer NOT NULL DEFAULT 350,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reward_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage
CREATE POLICY "Admins can manage reward settings"
ON public.reward_settings
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view
CREATE POLICY "Staff can view reward settings"
ON public.reward_settings
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Anyone can view (needed for web checkout rewards display)
CREATE POLICY "Anyone can view reward settings"
ON public.reward_settings
FOR SELECT
USING (true);

-- Insert default row
INSERT INTO public.reward_settings (is_enabled, dollars_per_point, points_per_dollar, min_points_to_redeem, max_points_per_order)
VALUES (true, 2, 10, 200, 350);

-- Trigger for updated_at
CREATE TRIGGER update_reward_settings_updated_at
BEFORE UPDATE ON public.reward_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
