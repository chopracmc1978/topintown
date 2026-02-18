
-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view active locations" ON public.locations;
DROP POLICY IF EXISTS "Admins can manage locations" ON public.locations;

-- Permissive policies
CREATE POLICY "Anyone can view active locations"
ON public.locations FOR SELECT
TO public
USING (is_active = true);

CREATE POLICY "Admins can manage all locations"
ON public.locations FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Admins need to SELECT all locations (including inactive) 
CREATE POLICY "Admins can view all locations"
ON public.locations FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));
