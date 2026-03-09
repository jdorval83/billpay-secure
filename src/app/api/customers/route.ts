import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("business_id", businessId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ customers: data });
}

export async function POST(request: Request) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const body = await request.json();
    const { name, email, phone, sms_consent, address_line1, address_line2, city, state, postal_code } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const insert: Record<string, unknown> = {
      business_id: businessId,
      name: name.trim(),
      email: email && String(email).trim() ? String(email).trim() : null,
      phone: phone && String(phone).trim() ? String(phone).trim() : null,
      address_line1: address_line1 && String(address_line1).trim() ? String(address_line1).trim() : null,
      address_line2: address_line2 && String(address_line2).trim() ? String(address_line2).trim() : null,
      city: city && String(city).trim() ? String(city).trim() : null,
      state: state && String(state).trim() ? String(state).trim() : null,
      postal_code: postal_code && String(postal_code).trim() ? String(postal_code).trim() : null,
    };
    if (sms_consent === true) {
      insert.sms_consent_at = new Date().toISOString();
    }

    const { data, error } = await supabaseAdmin
      .from("customers")
      .insert(insert)
      .select()
      .single();

    if (error) {
      console.error("[POST /api/customers] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ customer: data });
  } catch (err) {
    console.error("[POST /api/customers] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
