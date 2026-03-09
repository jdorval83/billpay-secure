import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { generateInvoicePdf } from "@/lib/pdf-invoice";

type RouteParams = {
  params: Promise<{ token: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  try {
    const { token } = await params;

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .select("*, customers(name, email, phone, address_line1, address_line2, city, state, postal_code)")
      .eq("public_token", token)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json(
        { error: invoiceError?.message || "Invoice not found" },
        { status: 404 }
      );
    }

    const businessId = (invoice as { business_id?: string }).business_id;
    const [
      { data: lineItems, error: lineItemsError },
      { data: business },
    ] = await Promise.all([
      supabaseAdmin
        .from("invoice_line_items")
        .select("*")
        .eq("invoice_id", invoice.id)
        .order("sort_order", { ascending: true }),
      businessId
        ? supabaseAdmin.from("businesses").select("*").eq("id", businessId).single()
        : Promise.resolve({ data: null }),
    ]);

    if (lineItemsError) {
      return NextResponse.json({ error: lineItemsError.message }, { status: 500 });
    }

    const items = (lineItems as { description?: string; quantity?: number; unit_price_cents?: number; amount_cents?: number }[]) || [];
    const pdfBytes = await generateInvoicePdf(invoice, items, (business as any) ?? null);

    return new NextResponse(new Uint8Array(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Cache-Control": "private, no-cache, no-store",
        "Content-Disposition": `inline; filename="${String(invoice.invoice_number || "bill")}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "PDF generation failed" },
      { status: 500 }
    );
  }
}
