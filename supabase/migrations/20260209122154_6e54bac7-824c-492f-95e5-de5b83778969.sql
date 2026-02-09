-- Fix: Allow deleting staff by setting pos_sessions reference to NULL
ALTER TABLE public.pos_sessions 
  DROP CONSTRAINT pos_sessions_pos_staff_id_fkey;

ALTER TABLE public.pos_sessions 
  ADD CONSTRAINT pos_sessions_pos_staff_id_fkey 
  FOREIGN KEY (pos_staff_id) 
  REFERENCES public.pos_staff(id) 
  ON DELETE SET NULL;

-- Also fix orders table FK to pos_staff
ALTER TABLE public.orders 
  DROP CONSTRAINT orders_pos_staff_id_fkey;

ALTER TABLE public.orders 
  ADD CONSTRAINT orders_pos_staff_id_fkey 
  FOREIGN KEY (pos_staff_id) 
  REFERENCES public.pos_staff(id) 
  ON DELETE SET NULL;

-- Ensure admin role can also access pos_staff (add explicit admin policy if missing)
-- Current policies already include admin, but let's also ensure the admin user 
-- who doesn't have 'staff' role can still operate
