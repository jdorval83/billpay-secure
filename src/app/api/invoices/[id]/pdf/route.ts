import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";
import { generateInvoicePdf } from "@/lib/pdf-invoice";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  let businessId: string;
  try {
    businessId = await getBusinessIdForRequest(request);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to resolve tenant" },
      { status: 500 }
    );
  }
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
  }

  const [
    { data: invoice, error: invoiceError },
    { data: lineItems, error: lineItemsError },
    { data: business },
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
      .from("businesses")
      .select("*")
      .eq("id", businessId)
      .single(),
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

  try {
    const items = (lineItems || []) as { description?: string; quantity?: number; unit_price_cents?: number; amount_cents?: number }[];
    const pdfBytes = await generateInvoicePdf(invoice, items, (business as any) ?? null);

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-cache, no-store",
        "Content-Disposition": `inline; filename="${String(invoice.invoice_number || "invoice")}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
