import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("bills")
    .select(`
      *,
      customers (name, email, phone)
    `)
    .eq("business_id", BUSINESS_ID)
    .order("due_date", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ bills: data });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { customer_id, amount_cents, description, due_date } = body;

    if (!customer_id || typeof customer_id !== "string") {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }
    const amount = Math.round(Number(amount_cents) || 0);
    if (amount <= 0) {
      return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("bills")
      .insert({
        business_id: BUSINESS_ID,
        customer_id: customer_id.trim(),
        amount_cents: amount,
        balance_cents: amount,
        description: (description && String(description).trim()) || "Invoice",
        due_date: due_date || new Date().toISOString().split("T")[0],
        status: "draft",
      })
      .select(`
        *,
        customers (name, email, phone)
      `)
      .single();

    if (error) {
      console.error("[POST /api/bills] Supabase error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ bill: data });
  } catch (err) {
    console.error("[POST /api/bills] Unexpected error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
