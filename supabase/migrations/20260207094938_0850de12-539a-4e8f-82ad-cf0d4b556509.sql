
-- Tighten coupon_usage INSERT to require authentication
-- No client-side code inserts into coupon_usage; edge functions use service_role (bypasses RLS)
DROP POLICY IF EXISTS "Anyone can create coupon usage" ON public.coupon_usage;

CREATE POLICY "Authenticated users can create coupon usage"
ON public.coupon_usage
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);
