import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { requireAuth } from "@/lib/auth";

export async function GET() {
  const auth = await requireAuth().catch(() => null);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { data, error } = await supabaseAdmin
    .from("bills")
    .select("*, customers(name, email, phone)")
    .eq("business_id", auth.businessId)
    .order("due_date", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bills: data });
}

export async function POST(request: Request) {
  const auth = await requireAuth().catch(() => null);
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const body = await request.json();
    const { customer_id, amount_cents, description, due_date } = body;
    if (!customer_id || typeof customer_id !== "string") {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }
    const amount = Math.round(Number(amount_cents) || 0);
    if (amount <= 0) return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from("bills")
      .insert({
        business_id: auth.businessId,
        customer_id: customer_id.trim(),
        amount_cents: amount,
        balance_cents: amount,
        description: (description && String(description).trim()) || "Invoice",
        due_date: due_date || new Date().toISOString().split("T")[0],
        status: "draft",
      })
      .select("*, customers(name, email, phone)")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bill: data });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
