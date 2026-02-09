-- Drop all existing RESTRICTIVE policies on pos_staff
DROP POLICY IF EXISTS "Staff can delete pos staff" ON public.pos_staff;
DROP POLICY IF EXISTS "Staff can insert pos staff" ON public.pos_staff;
DROP POLICY IF EXISTS "Staff can update pos staff" ON public.pos_staff;
DROP POLICY IF EXISTS "Staff can view pos staff" ON public.pos_staff;

-- Recreate as PERMISSIVE policies (default behavior)
CREATE POLICY "Staff can view pos staff"
ON public.pos_staff FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can insert pos staff"
ON public.pos_staff FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can update pos staff"
ON public.pos_staff FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Staff can delete pos staff"
ON public.pos_staff FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
