import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await getBusinessIdForRequest(_request);
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
  }

  const [
    { data: invoice, error: invoiceError },
    { data: lineItems, error: lineItemsError },
    { data: links, error: linksError },
  ] = await Promise.all([
    supabaseAdmin
      .from("invoices")
      .select("*, customers(name, email, phone)")
      .eq("business_id", businessId)
      .eq("id", id)
      .single(),
    supabaseAdmin
      .from("invoice_line_items")
      .select("*")
      .eq("invoice_id", id)
      .order("sort_order", { ascending: true }),
    supabaseAdmin
      .from("invoice_bills")
      .select("bill_id")
      .eq("invoice_id", id),
  ]);

  if (invoiceError || !invoice) {
    return NextResponse.json(
      { error: invoiceError?.message || "Invoice not found" },
      { status: 404 }
    );
  }
  if (lineItemsError) {
    return NextResponse.json({ error: lineItemsError.message }, { status: 500 });
  }
  if (linksError) {
    return NextResponse.json({ error: linksError.message }, { status: 500 });
  }

  let bills: unknown[] = [];
  const billIds = (links || []).map((l: { bill_id: string }) => l.bill_id);
  if (billIds.length > 0) {
    const { data: billsData, error: billsError } = await supabaseAdmin
      .from("bills")
      .select("*, customers(name, email, phone)")
      .eq("business_id", BUSINESS_ID)
      .in("id", billIds);
    if (billsError) {
      return NextResponse.json({ error: billsError.message }, { status: 500 });
    }
    bills = billsData || [];
  }

  return NextResponse.json({
    invoice,
    lineItems: lineItems || [],
    bills,
  });
}

