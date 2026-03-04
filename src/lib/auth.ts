import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";
import { cookies } from "next/headers";

const BIZ_COOKIE = "billpay_business_id";

export async function getSessionWithBusiness() {
  const supabase = await createClient();
  const { data: { session }, error } = await supabase.auth.getSession();
  if (error || !session) return null;

  const { data: userBusinesses } = await supabaseAdmin
    .from("user_businesses")
    .select("business_id")
    .eq("user_id", session.user.id);

  const businessIds = (userBusinesses || []).map((ub) => ub.business_id);
  if (businessIds.length === 0) return null;

  const cookieStore = await cookies();
  const preferred = cookieStore.get(BIZ_COOKIE)?.value;
  const businessId = preferred && businessIds.includes(preferred)
    ? preferred
    : businessIds[0];

  return { session, businessId, businessIds };
}

export async function requireAuth() {
  const result = await getSessionWithBusiness();
  if (!result) throw new Error("Unauthorized");
  return result;
}
