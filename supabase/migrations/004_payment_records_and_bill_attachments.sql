-- Payment records (check / cash / other) received outside the system
CREATE TABLE IF NOT EXISTS public.payment_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  amount_cents bigint NOT NULL,
  check_number text,
  payer_name text,
  paid_at date NOT NULL,
  notes text,
  image_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_records_business_id ON public.payment_records(business_id);
CREATE INDEX IF NOT EXISTS idx_payment_records_paid_at ON public.payment_records(paid_at);

-- Link payment records to bills that were paid by this payment
CREATE TABLE IF NOT EXISTS public.payment_record_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_record_id uuid NOT NULL REFERENCES public.payment_records(id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  UNIQUE(payment_record_id, bill_id)
);

CREATE INDEX IF NOT EXISTS idx_payment_record_bills_payment ON public.payment_record_bills(payment_record_id);
CREATE INDEX IF NOT EXISTS idx_payment_record_bills_bill ON public.payment_record_bills(bill_id);

-- Bill job/item photo and write-off fields (if missing)
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS attachment_url text;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS written_off_at timestamptz;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS writeoff_reason text;

-- Create storage buckets in Supabase Dashboard: Storage -> New bucket
-- - check-images (public, for check photos, max 500KB per file)
-- - bill-attachments (public, for job/item photos, max 500KB per file)
