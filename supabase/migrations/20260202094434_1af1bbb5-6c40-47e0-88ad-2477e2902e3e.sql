-- Create popup_posters table
CREATE TABLE public.popup_posters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT,
  image_url TEXT NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.popup_posters ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Admins can manage popup posters" 
ON public.popup_posters 
FOR ALL 
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active popup posters" 
ON public.popup_posters 
FOR SELECT 
USING (is_active = true);

-- Trigger for updated_at
CREATE TRIGGER update_popup_posters_updated_at
BEFORE UPDATE ON public.popup_posters
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();