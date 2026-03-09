-- Add reminder_interval_days to businesses: send recurring reminders every N days for past-due bills (0 = disabled)
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS reminder_interval_days integer NOT NULL DEFAULT 0;
