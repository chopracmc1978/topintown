
-- Table to store incoming phone call events from IP phones
CREATE TABLE public.incoming_calls (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  caller_phone TEXT NOT NULL,
  caller_name TEXT,
  location_id TEXT NOT NULL,
  handled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.incoming_calls ENABLE ROW LEVEL SECURITY;

-- Staff can view and update incoming calls
CREATE POLICY "Staff can view incoming calls"
  ON public.incoming_calls FOR SELECT
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can update incoming calls"
  ON public.incoming_calls FOR UPDATE
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can delete incoming calls"
  ON public.incoming_calls FOR DELETE
  USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- Enable realtime for instant notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.incoming_calls;

-- Auto-cleanup old calls (older than 24h) - index for efficient queries
CREATE INDEX idx_incoming_calls_location_handled ON public.incoming_calls (location_id, handled, created_at DESC);
