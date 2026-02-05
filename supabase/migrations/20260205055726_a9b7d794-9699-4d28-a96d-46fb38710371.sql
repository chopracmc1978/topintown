-- Add DELETE policy for order_items to allow editing orders
CREATE POLICY "Staff can delete order items" 
ON public.order_items 
FOR DELETE 
USING (true);

-- Add UPDATE policy for order_items  
CREATE POLICY "Staff can update order items"
ON public.order_items
FOR UPDATE
USING (true);