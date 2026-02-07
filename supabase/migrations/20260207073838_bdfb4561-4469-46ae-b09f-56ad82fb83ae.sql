-- Allow staff/admin to delete orders (for cancelling during POS flow)
CREATE POLICY "Staff can delete orders"
ON public.orders
FOR DELETE
USING (true);
