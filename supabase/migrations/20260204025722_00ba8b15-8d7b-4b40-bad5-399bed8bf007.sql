-- Create receipt settings table for customizing printed receipts
CREATE TABLE public.receipt_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  location_id text NOT NULL UNIQUE,
  
  -- Logo settings
  logo_url text,
  footer_text text DEFAULT 'Thanks For Ordering!',
  
  -- Customer Receipt Header settings
  customer_header_font_height integer DEFAULT 1,
  customer_header_font_width integer DEFAULT 1,
  customer_show_logo boolean DEFAULT true,
  customer_show_store_name boolean DEFAULT true,
  customer_show_store_phone boolean DEFAULT true,
  customer_show_store_email boolean DEFAULT false,
  customer_show_store_address boolean DEFAULT true,
  customer_show_printed_on boolean DEFAULT true,
  
  -- Customer Receipt Order Detail settings
  customer_detail_font_height integer DEFAULT 1,
  customer_detail_font_width integer DEFAULT 1,
  customer_show_order_id boolean DEFAULT true,
  customer_show_order_date boolean DEFAULT true,
  customer_show_customer_name boolean DEFAULT true,
  customer_show_customer_phone boolean DEFAULT true,
  customer_show_order_type boolean DEFAULT true,
  customer_show_payment_method boolean DEFAULT true,
  customer_show_notes boolean DEFAULT true,
  
  -- Kitchen Ticket Header settings
  kitchen_header_font_height integer DEFAULT 1,
  kitchen_header_font_width integer DEFAULT 1,
  kitchen_show_order_id boolean DEFAULT true,
  kitchen_show_order_date boolean DEFAULT true,
  kitchen_show_customer_name boolean DEFAULT true,
  kitchen_show_customer_phone boolean DEFAULT true,
  kitchen_show_order_type boolean DEFAULT true,
  kitchen_show_cashier boolean DEFAULT false,
  kitchen_show_notes boolean DEFAULT true,
  
  -- Kitchen Ticket Order Detail settings
  kitchen_detail_font_height integer DEFAULT 1,
  kitchen_detail_font_width integer DEFAULT 2,
  kitchen_show_prep_time boolean DEFAULT false,
  kitchen_show_order_number boolean DEFAULT true,
  
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.receipt_settings ENABLE ROW LEVEL SECURITY;

-- Admins can manage receipt settings
CREATE POLICY "Admins can manage receipt settings" ON public.receipt_settings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Staff can view receipt settings
CREATE POLICY "Staff can view receipt settings" ON public.receipt_settings
  FOR SELECT USING (has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'staff'::app_role));

-- Create trigger for updated_at
CREATE TRIGGER update_receipt_settings_updated_at
  BEFORE UPDATE ON public.receipt_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default settings for existing locations
INSERT INTO public.receipt_settings (location_id) VALUES ('calgary'), ('chestermere')
ON CONFLICT (location_id) DO NOTHING;