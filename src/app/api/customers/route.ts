import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth().catch(() => null);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from("customers")
    .select("*")
    .eq("business_id", auth.businessId)
    .order("name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ customers: data });
}

export async function POST(request: Request) {
  const auth = await requireAuth().catch(() => null);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { name, email, phone } = body;
    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
    .from("customers")
    .insert({
      business_id: auth.businessId,
      name: name.trim(),
      email: email && String(email).trim() ? String(email).trim() : null,
      phone: phone && String(phone).trim() ? String(phone).trim() : null,
    })
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
