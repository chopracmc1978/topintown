-- Allow staff to update location hours
CREATE POLICY "Staff can update location hours"
ON public.location_hours
FOR UPDATE
USING (has_role(auth.uid(), 'staff'::app_role) OR has_role(auth.uid(), 'admin'::app_role));
