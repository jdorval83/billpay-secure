import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await getBusinessIdForRequest(request);
  const { data: current } = await supabaseAdmin
    .from("businesses")
    .select("id, kind")
    .eq("id", businessId)
    .single();

  if (!current || (current as { kind?: string }).kind !== "platform") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const { error } = await supabaseAdmin
    .from("signup_requests")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true, message: "Request rejected" });
}
