import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export type Bill = {
  id: string;
  business_id: string;
  customer_id: string;
  amount_cents: number;
  balance_cents: number;
  description: string;
  due_date: string;
  status: string;
  stripe_checkout_session_id: string | null;
  payment_link: string | null;
  sent_at: string | null;
  paid_at: string | null;
  created_at: string;
  customers?: { name: string; email: string | null; phone: string | null };
};

export type Customer = {
  id: string;
  business_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  created_at: string;
};
