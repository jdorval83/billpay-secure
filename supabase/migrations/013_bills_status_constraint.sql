-- Drop old constraint (may disallow ready, billed, past_due)
ALTER TABLE public.bills DROP CONSTRAINT IF EXISTS bills_status_check;

-- Migrate legacy "overdue" to "past_due"
UPDATE public.bills SET status = 'past_due' WHERE LOWER(TRIM(status)) = 'overdue';

-- Add new constraint with allowed statuses
ALTER TABLE public.bills ADD CONSTRAINT bills_status_check CHECK (
  status IN ('draft', 'ready', 'billed', 'past_due', 'paid', 'finalized', 'sent', 'written_off', 'void')
);
