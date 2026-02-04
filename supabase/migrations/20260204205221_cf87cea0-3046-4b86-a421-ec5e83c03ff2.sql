-- Add custom header/footer fields per location
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS header_line1 text DEFAULT 'TOP IN TOWN PIZZA LTD.',
ADD COLUMN IF NOT EXISTS header_line2 text DEFAULT '',
ADD COLUMN IF NOT EXISTS header_line3 text DEFAULT '',
ADD COLUMN IF NOT EXISTS header_address text DEFAULT '',
ADD COLUMN IF NOT EXISTS header_phone text DEFAULT '',
ADD COLUMN IF NOT EXISTS header_email text DEFAULT '',
ADD COLUMN IF NOT EXISTS header_website text DEFAULT 'www.topintownpizza.com',
ADD COLUMN IF NOT EXISTS footer_line1 text DEFAULT 'Thank You!',
ADD COLUMN IF NOT EXISTS footer_line2 text DEFAULT '',
ADD COLUMN IF NOT EXISTS footer_line3 text DEFAULT '',
ADD COLUMN IF NOT EXISTS footer_gst text DEFAULT '',
ADD COLUMN IF NOT EXISTS footer_social text DEFAULT '';

-- Add per-field font settings (size 1-4, bold boolean)
-- Store Name
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS store_name_size integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS store_name_bold boolean DEFAULT true;

-- Store Address
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS store_address_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS store_address_bold boolean DEFAULT false;

-- Store Phone
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS store_phone_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS store_phone_bold boolean DEFAULT false;

-- Order ID
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS order_id_size integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS order_id_bold boolean DEFAULT true;

-- Order Date
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS order_date_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS order_date_bold boolean DEFAULT false;

-- Order Type
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS order_type_size integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS order_type_bold boolean DEFAULT true;

-- Customer Name
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS customer_name_size integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS customer_name_bold boolean DEFAULT true;

-- Customer Phone
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS customer_phone_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS customer_phone_bold boolean DEFAULT false;

-- Item Name
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS item_name_size integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS item_name_bold boolean DEFAULT true;

-- Item Details
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS item_details_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS item_details_bold boolean DEFAULT false;

-- Item Price
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS item_price_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS item_price_bold boolean DEFAULT false;

-- Totals
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS totals_size integer DEFAULT 2,
ADD COLUMN IF NOT EXISTS totals_bold boolean DEFAULT true;

-- Footer
ALTER TABLE public.receipt_settings
ADD COLUMN IF NOT EXISTS footer_size integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS footer_bold boolean DEFAULT false;