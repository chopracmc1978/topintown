-- Ensure order numbers are unique (prevents duplicate TIT-... numbers under concurrency)
CREATE UNIQUE INDEX IF NOT EXISTS orders_order_number_unique_idx
ON public.orders (order_number);

-- Atomically allocate the next order number for a location/day (Mountain Time)
CREATE OR REPLACE FUNCTION public.next_order_number(p_location_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  loc_code text;
  local_now timestamp;
  date_part text;
  prefix text;
  max_seq int;
  next_seq int;
BEGIN
  loc_code := CASE lower(coalesce(p_location_id, 'calgary'))
    WHEN 'calgary' THEN 'CAL'
    WHEN 'chestermere' THEN 'KIN'
    ELSE 'CAL'
  END;

  -- Use America/Edmonton to correctly handle MST/MDT transitions
  local_now := timezone('America/Edmonton', now());
  date_part := upper(to_char(local_now, 'YYMONDD')); -- e.g. 26FEB01
  prefix := format('TIT-%s-%s', loc_code, date_part);

  -- Serialize allocation per prefix (location+day)
  PERFORM pg_advisory_xact_lock(hashtext(prefix));

  SELECT max((substring(order_number from length(prefix) + 1))::int)
    INTO max_seq
  FROM public.orders
  WHERE order_number LIKE prefix || '%'
    AND substring(order_number from length(prefix) + 1) ~ '^[0-9]+$';

  IF max_seq IS NULL OR max_seq < 101 THEN
    next_seq := 101;
  ELSE
    next_seq := max_seq + 1;
  END IF;

  RETURN prefix || next_seq::text;
END;
$$;

-- Prevent direct client calls; edge/backend code using service role can execute
REVOKE ALL ON FUNCTION public.next_order_number(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_order_number(text) TO service_role;
