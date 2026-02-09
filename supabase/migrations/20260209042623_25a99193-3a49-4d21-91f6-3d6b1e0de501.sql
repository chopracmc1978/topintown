-- Allow admins to delete customers
CREATE POLICY "Admins can delete customers"
ON public.customers
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));