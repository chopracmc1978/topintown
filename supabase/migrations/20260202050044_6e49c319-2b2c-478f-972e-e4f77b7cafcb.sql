-- Fix promotions RLS policies (change from RESTRICTIVE to PERMISSIVE)
DROP POLICY IF EXISTS "Admins can manage promotions" ON public.promotions;
DROP POLICY IF EXISTS "Anyone can view active promotions" ON public.promotions;

CREATE POLICY "Admins can manage promotions"
ON public.promotions
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active promotions"
ON public.promotions
FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- Fix coupons RLS policies (change from RESTRICTIVE to PERMISSIVE)
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
DROP POLICY IF EXISTS "Anyone can view active coupons" ON public.coupons;

CREATE POLICY "Admins can manage coupons"
ON public.coupons
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Anyone can view active coupons"
ON public.coupons
FOR SELECT
TO anon, authenticated
USING (is_active = true);