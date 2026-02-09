
-- 1. Restrict customers table to staff/admin only
-- Web customers access via service_role edge functions
DROP POLICY IF EXISTS "Authenticated users can view customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can create customers" ON public.customers;
DROP POLICY IF EXISTS "Authenticated users can update customers" ON public.customers;

CREATE POLICY "Staff can view customers" ON public.customers
FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can create customers" ON public.customers
FOR INSERT WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can update customers" ON public.customers
FOR UPDATE USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- 2. Restrict customer_rewards SELECT to authenticated only (staff/admin have Supabase Auth)
DROP POLICY IF EXISTS "Anyone can view rewards by phone" ON public.customer_rewards;

CREATE POLICY "Authenticated users can view rewards" ON public.customer_rewards
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 3. Restrict rewards_history SELECT to authenticated only
DROP POLICY IF EXISTS "Anyone can view rewards history" ON public.rewards_history;

CREATE POLICY "Authenticated users can view rewards history" ON public.rewards_history
FOR SELECT USING (auth.uid() IS NOT NULL);

-- 4. Restrict coupon_usage SELECT to staff/admin only
DROP POLICY IF EXISTS "Authenticated users can view coupon usage" ON public.coupon_usage;
DROP POLICY IF EXISTS "Authenticated users can create coupon usage" ON public.coupon_usage;

CREATE POLICY "Staff can view coupon usage" ON public.coupon_usage
FOR SELECT USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can create coupon usage" ON public.coupon_usage
FOR INSERT WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
