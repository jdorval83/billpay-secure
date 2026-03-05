-- ============================================================
-- BillPay Secure - SQL Scripts to Run in Supabase SQL Editor
-- Run scripts in order. Skip any that fail (e.g. table exists).
-- ============================================================

-- ------------------------------------------------------------
-- 1. CUSTOMERS (run if table doesn't exist)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  phone text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_customers_business_id ON public.customers(business_id);


-- ------------------------------------------------------------
-- 2. BILLS (run if table doesn't exist)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL,
  balance_cents bigint NOT NULL,
  description text,
  due_date date NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  stripe_checkout_session_id text,
  payment_link text,
  sent_at timestamptz,
  paid_at timestamptz,
  first_sent_at timestamptz,
  last_sent_at timestamptz,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bills_business_id ON public.bills(business_id);
CREATE INDEX IF NOT EXISTS idx_bills_customer_id ON public.bills(customer_id);
CREATE INDEX IF NOT EXISTS idx_bills_due_date ON public.bills(due_date);


-- ------------------------------------------------------------
-- 3. INVOICES
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  customer_id uuid NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  invoice_number text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  issued_at timestamptz NOT NULL,
  due_at timestamptz NOT NULL,
  subtotal_cents bigint NOT NULL,
  tax_cents bigint NOT NULL DEFAULT 0,
  total_cents bigint NOT NULL,
  snapshot jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_business_id ON public.invoices(business_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON public.invoices(customer_id);


-- ------------------------------------------------------------
-- 4. INVOICE_BILLS (junction table)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  UNIQUE(invoice_id, bill_id)
);

CREATE INDEX IF NOT EXISTS idx_invoice_bills_invoice_id ON public.invoice_bills(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_bills_bill_id ON public.invoice_bills(bill_id);


-- ------------------------------------------------------------
-- 5. INVOICE_LINE_ITEMS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description text NOT NULL,
  quantity numeric,
  unit_price_cents bigint,
  amount_cents bigint NOT NULL,
  sort_order int DEFAULT 0,
  source_type text DEFAULT 'manual',
  source_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);


-- ------------------------------------------------------------
-- 6. BILL_SEND_EVENTS
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bill_send_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL,
  bill_id uuid REFERENCES public.bills(id) ON DELETE SET NULL,
  invoice_id uuid REFERENCES public.invoices(id) ON DELETE SET NULL,
  customer_id uuid REFERENCES public.customers(id) ON DELETE SET NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  channel text,
  recipient text,
  status text,
  message_id text,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bill_send_events_bill_id ON public.bill_send_events(bill_id);
CREATE INDEX IF NOT EXISTS idx_bill_send_events_sent_at ON public.bill_send_events(sent_at);
-- idx_bill_send_events_business_id created in section 9 (after ensuring column exists on existing tables)


-- ------------------------------------------------------------
-- 7. FIX: Add business_id to invoices (if table existed without it)
-- ------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'invoices' AND column_name = 'business_id'
  ) THEN
    ALTER TABLE public.invoices ADD COLUMN business_id uuid;
    UPDATE public.invoices SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
    ALTER TABLE public.invoices ALTER COLUMN business_id SET NOT NULL;
  END IF;
END $$;


-- ------------------------------------------------------------
-- 8. FIX: Add first_sent_at, last_sent_at to bills (if missing)
-- ------------------------------------------------------------
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS first_sent_at timestamptz;
ALTER TABLE public.bills ADD COLUMN IF NOT EXISTS last_sent_at timestamptz;


-- ------------------------------------------------------------
-- 9. FIX: Add business_id to bill_send_events (if table existed without it)
-- Always add column first, then set NOT NULL and index (avoids "column does not exist")
-- ------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'bill_send_events') THEN
    -- Add column if missing (must run before ALTER COLUMN / CREATE INDEX)
    ALTER TABLE public.bill_send_events ADD COLUMN IF NOT EXISTS business_id uuid;
    UPDATE public.bill_send_events SET business_id = '00000000-0000-0000-0000-000000000001' WHERE business_id IS NULL;
    ALTER TABLE public.bill_send_events ALTER COLUMN business_id SET NOT NULL;
    CREATE INDEX IF NOT EXISTS idx_bill_send_events_business_id ON public.bill_send_events(business_id);
  END IF;
END $$;


-- ------------------------------------------------------------
-- 10. RLS (Row Level Security) - optional, enable if using RLS
-- ------------------------------------------------------------
-- ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.bills ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
-- ... add policies as needed for your auth setup
