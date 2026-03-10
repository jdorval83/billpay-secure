-- Signup requests: pending new account requests for admin approval
CREATE TABLE IF NOT EXISTS public.signup_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_name text NOT NULL,
  subdomain text NOT NULL,
  email text NOT NULL,
  password_temp text NOT NULL,
  support_email text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at timestamptz DEFAULT now(),
  reviewed_at timestamptz,
  reviewed_by uuid REFERENCES auth.users(id)
);

COMMENT ON COLUMN public.signup_requests.password_temp IS 'Temporary; used once on approval, then row deleted';

CREATE INDEX IF NOT EXISTS idx_signup_requests_status ON public.signup_requests(status);
CREATE INDEX IF NOT EXISTS idx_signup_requests_created_at ON public.signup_requests(created_at DESC);
