
-- ============================================================
-- Lock down customers table: restrict all access to authenticated users only
-- Web customers now go through edge functions (service_role bypasses RLS)
-- ============================================================

-- DROP existing overly permissive policies on customers
DROP POLICY IF EXISTS "Customers can view own profile" ON public.customers;
DROP POLICY IF EXISTS "Anyone can create a customer account" ON public.customers;
DROP POLICY IF EXISTS "Customers can update own profile" ON public.customers;

-- ADD restricted policies: only Supabase-authenticated users (POS/admin) can access directly
CREATE POLICY "Authenticated users can view customers"
ON public.customers FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create customers"
ON public.customers FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update customers"
ON public.customers FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Lock down orders table SELECT: restrict to authenticated users only
-- Web customers already use get-customer-orders/get-order-details edge functions
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;

CREATE POLICY "Authenticated users can view orders"
ON public.orders FOR SELECT
USING (auth.uid() IS NOT NULL);

-- ============================================================
-- Lock down order_items table SELECT: restrict to authenticated users only
-- Web customers already use edge functions for order data
-- ============================================================

DROP POLICY IF EXISTS "Anyone can view order items" ON public.order_items;

CREATE POLICY "Authenticated users can view order items"
ON public.order_items FOR SELECT
USING (auth.uid() IS NOT NULL);
