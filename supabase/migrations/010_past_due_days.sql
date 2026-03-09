-- Add past_due_days to businesses: days after due date before bill is "past due"
-- 0 = due date is cutoff, 7 = 7 days grace before past due
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS past_due_days integer NOT NULL DEFAULT 0;
