-- Create rewards table to track customer reward points
CREATE TABLE public.customer_rewards (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  points INTEGER NOT NULL DEFAULT 0,
  lifetime_points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_customer_reward UNIQUE (customer_id),
  CONSTRAINT unique_phone_reward UNIQUE (phone)
);

-- Create rewards history table to track point transactions
CREATE TABLE public.rewards_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
  phone TEXT NOT NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  points_change INTEGER NOT NULL,
  transaction_type TEXT NOT NULL, -- 'earned', 'redeemed'
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.customer_rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rewards_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for customer_rewards
CREATE POLICY "Anyone can view rewards by phone" 
ON public.customer_rewards 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert rewards" 
ON public.customer_rewards 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Anyone can update rewards" 
ON public.customer_rewards 
FOR UPDATE 
USING (true);

-- RLS policies for rewards_history
CREATE POLICY "Anyone can view rewards history" 
ON public.rewards_history 
FOR SELECT 
USING (true);

CREATE POLICY "Anyone can insert rewards history" 
ON public.rewards_history 
FOR INSERT 
WITH CHECK (true);

-- Add trigger for updated_at
CREATE TRIGGER update_customer_rewards_updated_at
BEFORE UPDATE ON public.customer_rewards
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add rewards_used column to orders to track redemptions
ALTER TABLE public.orders ADD COLUMN rewards_used INTEGER DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN rewards_discount NUMERIC DEFAULT 0;