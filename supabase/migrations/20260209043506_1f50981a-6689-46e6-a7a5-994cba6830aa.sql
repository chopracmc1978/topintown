-- Allow admins to delete customer rewards
CREATE POLICY "Admins can delete customer rewards"
ON public.customer_rewards
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admins to delete rewards history
CREATE POLICY "Admins can delete rewards history"
ON public.rewards_history
FOR DELETE
USING (has_role(auth.uid(), 'admin'::app_role));
