-- Ensure businesses table and platform row exist (fix for Vercel / partial migration)
-- Run this if 005 didn't fully apply or platform row is missing

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

-- Add kind column if table existed without it
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'businesses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'businesses' AND column_name = 'kind') THEN
      ALTER TABLE public.businesses ADD COLUMN kind text NOT NULL DEFAULT 'tenant';
      ALTER TABLE public.businesses ADD CONSTRAINT businesses_kind_check CHECK (kind IN ('platform', 'tenant'));
    END IF;
  END IF;
END $$;

-- Ensure platform business row exists (id used as DEFAULT_BUSINESS_ID / fallback tenant)
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
  name = COALESCE(EXCLUDED.name, businesses.name),
  subdomain = COALESCE(businesses.subdomain, 'test'),
  support_email = COALESCE(EXCLUDED.support_email, businesses.support_email);
