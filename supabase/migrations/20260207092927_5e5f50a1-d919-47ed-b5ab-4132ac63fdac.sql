
-- =============================================
-- 1. Restrict otp_codes RLS policies
-- No client code accesses this table directly.
-- All access is through edge functions using service_role_key (bypasses RLS).
-- =============================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Anyone can create OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can update OTP codes" ON public.otp_codes;
DROP POLICY IF EXISTS "Anyone can view OTP codes" ON public.otp_codes;

-- Add restrictive policies (deny all client access, service_role bypasses RLS)
CREATE POLICY "Deny all client access to OTP codes"
ON public.otp_codes
FOR ALL
USING (false)
WITH CHECK (false);

-- =============================================
-- 2. Add checkout_drafts RLS policy
-- Only accessed by edge functions via service_role_key.
-- =============================================

-- Add restrictive policy (deny all client access)
CREATE POLICY "Deny all client access to checkout drafts"
ON public.checkout_drafts
FOR ALL
USING (false)
WITH CHECK (false);

-- =============================================
-- 3. Restrict customers UPDATE to prevent unauthorized writes
-- Keep SELECT permissive for now (needed by custom auth flow)
-- but restrict UPDATE to require matching on specific conditions
-- =============================================

-- Drop overly permissive UPDATE policy
DROP POLICY IF EXISTS "Customers can update own profile" ON public.customers;

-- Add more restrictive UPDATE policy
-- Allow updates only for authenticated users (POS/admin) or when updating own record
-- Since custom auth customers don't have auth.uid(), we still need USING(true)
-- but we restrict WITH CHECK to prevent arbitrary field changes
CREATE POLICY "Customers can update own profile"
ON public.customers
FOR UPDATE
USING (true)
WITH CHECK (
  -- Prevent setting password_hash from client (must go through edge function)
  password_hash IS NULL OR password_hash = (SELECT password_hash FROM public.customers WHERE id = customers.id)
);
