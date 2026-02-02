-- Add scheduling columns to promotions table
ALTER TABLE public.promotions
ADD COLUMN schedule_type text DEFAULT 'always',
ADD COLUMN schedule_days integer[] DEFAULT NULL,
ADD COLUMN schedule_dates integer[] DEFAULT NULL;

-- schedule_type can be: 'always', 'days_of_week', 'dates_of_month'
-- schedule_days: array of weekday numbers (0=Sunday, 1=Monday, ..., 6=Saturday)
-- schedule_dates: array of day numbers (1-31)

COMMENT ON COLUMN public.promotions.schedule_type IS 'Type of scheduling: always, days_of_week, or dates_of_month';
COMMENT ON COLUMN public.promotions.schedule_days IS 'Array of weekday numbers (0=Sunday to 6=Saturday) when promotion is active';
COMMENT ON COLUMN public.promotions.schedule_dates IS 'Array of day-of-month numbers (1-31) when promotion is active';