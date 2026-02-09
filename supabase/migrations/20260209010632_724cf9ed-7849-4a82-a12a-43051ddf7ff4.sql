-- Create an atomic function for reward point deduction to prevent TOCTOU race conditions
-- Uses row-level locking (FOR UPDATE) to serialize concurrent deductions
CREATE OR REPLACE FUNCTION public.deduct_reward_points(
  p_phone TEXT,
  p_points_to_deduct INTEGER
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_current_points INTEGER;
BEGIN
  -- Lock the row for this phone to serialize concurrent access
  SELECT points INTO v_current_points
  FROM customer_rewards
  WHERE phone = p_phone
  FOR UPDATE;

  -- If no record found or insufficient points, return false
  IF NOT FOUND OR v_current_points < p_points_to_deduct THEN
    RETURN FALSE;
  END IF;

  -- Atomic decrement - no stale data possible due to FOR UPDATE lock
  UPDATE customer_rewards
  SET points = points - p_points_to_deduct,
      updated_at = now()
  WHERE phone = p_phone;

  RETURN TRUE;
END;
$$;