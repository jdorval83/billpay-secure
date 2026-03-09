-- Add first_sent_at and last_sent_at to bills (for send tracking)
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS first_sent_at timestamptz;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;
