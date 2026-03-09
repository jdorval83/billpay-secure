import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

const PRODUCTION_DOMAIN = "billpaysecure.com";

export async function POST(request: Request) {
  const { email, password } = await request.json();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 });
  }

  const subdomain = data.user?.user_metadata?.business_subdomain;
  const redirectUrl =
    subdomain && typeof subdomain === "string"
      ? `https://${subdomain}.${PRODUCTION_DOMAIN}/dashboard`
      : undefined;

  return NextResponse.json({ user: data.user, redirectUrl });
}
