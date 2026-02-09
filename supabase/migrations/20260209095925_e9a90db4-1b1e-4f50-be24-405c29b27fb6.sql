
-- Create table for POS note shortcuts (numeric key -> text replacement)
CREATE TABLE public.note_shortcuts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id text NOT NULL DEFAULT 'calgary',
  shortcut_key text NOT NULL,
  replacement_text text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.note_shortcuts ENABLE ROW LEVEL SECURITY;

-- Staff and admins can manage shortcuts
CREATE POLICY "Staff can view note shortcuts"
ON public.note_shortcuts
FOR SELECT
USING (has_role(auth.uid(), 'staff') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage note shortcuts"
ON public.note_shortcuts
FOR ALL
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));

-- Insert default shortcuts
INSERT INTO public.note_shortcuts (location_id, shortcut_key, replacement_text, sort_order)
VALUES 
  ('calgary', '1', 'Half Cheese', 0),
  ('calgary', '2', '3 Slice Cheese', 1),
  ('chestermere', '1', 'Half Cheese', 0),
  ('chestermere', '2', '3 Slice Cheese', 1);
