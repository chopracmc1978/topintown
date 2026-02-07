
-- =============================================
-- Tighten RLS policies: require authentication for write operations
-- Web checkout uses service_role (bypasses RLS), POS staff use Supabase Auth
-- SELECT policies remain permissive for web customer reads
-- =============================================

-- ============ pos_sessions ============
-- Only authenticated staff/admin should access POS sessions
DROP POLICY IF EXISTS "Staff can create sessions" ON public.pos_sessions;
DROP POLICY IF EXISTS "Staff can update sessions" ON public.pos_sessions;
DROP POLICY IF EXISTS "Staff can view sessions for their location" ON public.pos_sessions;

CREATE POLICY "Staff can view sessions"
ON public.pos_sessions
FOR SELECT
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can create sessions"
ON public.pos_sessions
FOR INSERT
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can update sessions"
ON public.pos_sessions
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ============ orders ============
-- INSERT/UPDATE: require authentication (web uses service_role edge functions)
-- DELETE: require staff/admin role
-- SELECT: keep permissive for web customer reads
DROP POLICY IF EXISTS "Anyone can create orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can update orders" ON public.orders;
DROP POLICY IF EXISTS "Staff can delete orders" ON public.orders;

CREATE POLICY "Authenticated users can create orders"
ON public.orders
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update orders"
ON public.orders
FOR UPDATE
USING (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can delete orders"
ON public.orders
FOR DELETE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ============ order_items ============
-- INSERT: require authentication
-- UPDATE/DELETE: require staff/admin
-- SELECT: keep permissive for web customer reads
DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can update order items" ON public.order_items;
DROP POLICY IF EXISTS "Staff can delete order items" ON public.order_items;

CREATE POLICY "Authenticated users can create order items"
ON public.order_items
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Staff can update order items"
ON public.order_items
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can delete order items"
ON public.order_items
FOR DELETE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

-- ============ customer_rewards ============
-- INSERT/UPDATE: require authentication (POS staff, web uses service_role)
-- SELECT: keep permissive for web customer reads
DROP POLICY IF EXISTS "Anyone can insert rewards" ON public.customer_rewards;
DROP POLICY IF EXISTS "Anyone can update rewards" ON public.customer_rewards;

CREATE POLICY "Authenticated users can insert rewards"
ON public.customer_rewards
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can update rewards"
ON public.customer_rewards
FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- ============ rewards_history ============
-- INSERT: require authentication (POS staff, web uses service_role)
-- SELECT: keep permissive for web customer reads
DROP POLICY IF EXISTS "Anyone can insert rewards history" ON public.rewards_history;

CREATE POLICY "Authenticated users can insert rewards history"
ON public.rewards_history
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
