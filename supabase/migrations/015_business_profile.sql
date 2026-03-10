-- Business profile: address, phone, website for branding on PDFs
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS address_line1 text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS address_line2 text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS postal_code text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS website text;
