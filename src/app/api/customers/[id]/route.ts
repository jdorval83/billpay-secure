import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await getBusinessIdForRequest(request);
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Customer ID required" }, { status: 400 });

  const { data: customer, error } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .eq("id", id)
    .single();

  if (error || !customer) {
    return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  }

  return NextResponse.json({ customer });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await getBusinessIdForRequest(request);
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Customer ID required" }, { status: 400 });

  let body: { name?: string; email?: string | null; phone?: string | null; sms_consent?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const update: Record<string, unknown> = {};
  if (typeof body.name === "string" && body.name.trim()) update.name = body.name.trim();
  if (body.email !== undefined) update.email = body.email && String(body.email).trim() ? String(body.email).trim() : null;
  if (body.phone !== undefined) update.phone = body.phone && String(body.phone).trim() ? String(body.phone).trim() : null;
  if (body.sms_consent === true) update.sms_consent_at = new Date().toISOString();
  if (body.sms_consent === false) update.sms_consent_at = null;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("customers")
    .update(update)
    .eq("business_id", businessId)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ customer: data });
}
