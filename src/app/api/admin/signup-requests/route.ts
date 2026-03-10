import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { data: current } = await supabaseAdmin
    .from("businesses")
    .select("id, kind")
    .eq("id", businessId)
    .single();

  if (!current || (current as { kind?: string }).kind !== "platform") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from("signup_requests")
    .select("id, business_name, subdomain, email, support_email, status, created_at")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ requests: data || [] });
}
