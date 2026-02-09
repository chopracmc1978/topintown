
-- Drop old admin-only policy
DROP POLICY IF EXISTS "Admins can manage printers" ON public.printers;

-- Allow both staff and admins to manage printers
CREATE POLICY "Staff and admins can manage printers"
ON public.printers FOR ALL
USING (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'staff'::app_role));
