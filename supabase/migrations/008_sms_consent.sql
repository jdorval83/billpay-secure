-- SMS consent for Twilio compliance
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS sms_consent_at timestamptz;
