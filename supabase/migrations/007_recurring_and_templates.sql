-- Recurring billing: add schedule to bills
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS recurring_schedule text; -- 'weekly' | 'biweekly' | 'monthly' | null
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS recurring_next_date date; -- next date to create next bill

-- Bill templates for reuse
CREATE TABLE IF NOT EXISTS public.bill_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  amount_cents bigint NOT NULL,
  default_due_days int DEFAULT 30,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bill_templates_business_id ON public.bill_templates(business_id);
