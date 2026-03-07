import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { data: current, error: currentError } = await supabaseAdmin
    .from("businesses")
    .select("id, kind")
    .eq("id", businessId)
    .single();

  if (currentError || !current || (current as { kind?: string }).kind !== "platform") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data: businesses, error } = await supabaseAdmin
    .from("businesses")
    .select("id, name, slug, subdomain, support_email, invoice_footer, logo_url, kind, created_at")
    .order("name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ businesses: businesses || [] });
}
