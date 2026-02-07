
-- =============================================
-- Fix 1: Prevent password_hash exposure via column-level privilege revocation
-- Client code never selects password_hash; edge functions use service_role (bypasses grants)
-- =============================================
REVOKE SELECT (password_hash) ON public.customers FROM anon;
REVOKE SELECT (password_hash) ON public.customers FROM authenticated;

-- =============================================
-- Fix 2: Restrict coupon_usage SELECT to authenticated users only
-- No client-side code reads coupon_usage; admin/POS are authenticated
-- =============================================
DROP POLICY IF EXISTS "Anyone can view coupon usage" ON public.coupon_usage;

CREATE POLICY "Authenticated users can view coupon usage"
ON public.coupon_usage
FOR SELECT
USING (auth.uid() IS NOT NULL);
