import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const [
    { data: invoice, error: invoiceError },
    { data: lineItems, error: lineItemsError },
  ] = await Promise.all([
    supabaseAdmin
      .from("invoices")
      .select("*, customers(name, email, phone)")
      .eq("business_id", BUSINESS_ID)
      .eq("public_token", token)
      .single(),
    supabaseAdmin
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", token) // will be replaced below if invoice is found
      .limit(0),
  ]);

  if (invoiceError || !invoice) {
    return NextResponse.json(
      { error: invoiceError?.message || "Invoice not found" },
      { status: 404 }
    );
  }

  const { data: realLineItems, error: realLineItemsError } = await supabaseAdmin
    .from("invoice_line_items")
    .select("*")
    .eq("invoice_id", invoice.id)
    .order("sort_order", { ascending: true });

  if (realLineItemsError) {
    return NextResponse.json({ error: realLineItemsError.message }, { status: 500 });
  }

  return NextResponse.json({
    invoice,
    lineItems: realLineItems || [],
  });
}

