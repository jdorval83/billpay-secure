-- Businesses table (tenant registry) and platform admin
CREATE TABLE IF NOT EXISTS public.businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text,
  subdomain text UNIQUE,
  support_email text,
  invoice_footer text,
  logo_url text,
  kind text NOT NULL DEFAULT 'tenant' CHECK (kind IN ('platform', 'tenant')),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_businesses_subdomain ON public.businesses(subdomain);
CREATE INDEX IF NOT EXISTS idx_businesses_kind ON public.businesses(kind);

-- Add public_token to invoices (for magic links)
ALTER TABLE public.invoices ADD COLUMN IF NOT EXISTS public_token text UNIQUE;
CREATE INDEX IF NOT EXISTS idx_invoices_public_token ON public.invoices(public_token) WHERE public_token IS NOT NULL;

-- Backfill public_token for existing invoices
UPDATE public.invoices SET public_token = gen_random_uuid()::text WHERE public_token IS NULL;

-- Seed platform + default tenant (localhost subdomain 'test' maps here)
INSERT INTO public.businesses (id, name, slug, subdomain, support_email, kind)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'BillPay Secure',
  'platform',
  'test',
  'support@billpaysecure.com',
  'platform'
)
ON CONFLICT (id) DO UPDATE SET
  kind = 'platform',
  subdomain = COALESCE(businesses.subdomain, 'test'),
  support_email = COALESCE(businesses.support_email, 'support@billpaysecure.com');

