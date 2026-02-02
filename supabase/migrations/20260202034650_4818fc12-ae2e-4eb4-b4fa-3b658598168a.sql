-- Create a table for POS sessions (end of day tracking)
CREATE TABLE public.pos_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id TEXT NOT NULL,
  user_id UUID NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  end_time TIMESTAMP WITH TIME ZONE,
  start_cash NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  end_cash NUMERIC(10,2),
  cash_sales_total NUMERIC(10,2),
  entered_cash_amount NUMERIC(10,2),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.pos_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies for staff access
CREATE POLICY "Staff can view sessions for their location" 
ON public.pos_sessions 
FOR SELECT 
USING (true);

CREATE POLICY "Staff can create sessions" 
ON public.pos_sessions 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Staff can update sessions" 
ON public.pos_sessions 
FOR UPDATE 
USING (true);

-- Create index for faster lookups
CREATE INDEX idx_pos_sessions_location_active ON public.pos_sessions(location_id, is_active);
CREATE INDEX idx_pos_sessions_user ON public.pos_sessions(user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_pos_sessions_updated_at
BEFORE UPDATE ON public.pos_sessions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();