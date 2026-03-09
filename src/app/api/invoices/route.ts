import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { data, error } = await supabaseAdmin
    .from("invoices")
    .select("*, customers(name, email)")
    .eq("business_id", businessId)
    .order("issued_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ invoices: data });
}

export async function POST(request: Request) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const body = await request.json();
    const { customerId, billIds = [], lineItems = [], issuedAt, dueAt } = body;
    if (!customerId) return NextResponse.json({ error: "customerId is required" }, { status: 400 });

    const [{ data: customer }, { data: bills, error: billsError }] = await Promise.all([
      supabaseAdmin.from("customers").select("*").eq("business_id", businessId).eq("id", customerId).single(),
      billIds.length
        ? supabaseAdmin.from("bills").select("*").eq("business_id", businessId).in("id", billIds)
        : Promise.resolve({ data: [], error: null } as const),
    ]);

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (billsError) return NextResponse.json({ error: billsError.message }, { status: 500 });

    const billList = bills || [];
    if (billIds.length > 0 && billList.some((b: { customer_id: string }) => b.customer_id !== customerId)) {
      return NextResponse.json({ error: "All bills must belong to the same customer" }, { status: 400 });
    }

    if (billIds.length > 0) {
      const { data: existingLinks, error: linksError } = await supabaseAdmin
        .from("invoice_bills")
        .select("bill_id")
        .in("bill_id", billIds);

      if (linksError) {
        return NextResponse.json({ error: linksError.message }, { status: 500 });
      }

      if (existingLinks && existingLinks.length > 0) {
        const alreadyLinkedIds = Array.from(new Set(existingLinks.map((row: { bill_id: string }) => row.bill_id)));
        return NextResponse.json(
          {
            error:
              alreadyLinkedIds.length === 1
                ? "That bill is already on an invoice."
                : "One or more selected bills are already on an invoice.",
            billIds: alreadyLinkedIds,
          },
          { status: 400 }
        );
      }
    }

    const baseLineItems =
      lineItems.length > 0
        ? lineItems
        : billList.map((b: { description?: string; balance_cents: number; id: string }, idx: number) => ({
            description: b.description || "Bill",
            quantity: 1,
            unitPriceCents: b.balance_cents,
            amountCents: b.balance_cents,
            sortOrder: idx,
            sourceType: "bill",
            sourceId: b.id,
          }));

    if (baseLineItems.length === 0) {
      return NextResponse.json({ error: "At least one bill or line item is required" }, { status: 400 });
    }

    const subtotalCents = baseLineItems.reduce((sum: number, item: { amountCents?: number }) => sum + (item.amountCents ?? 0), 0);
    const taxCents = 0;
    const totalCents = subtotalCents + taxCents;
    const issuedAtValue = issuedAt ? new Date(issuedAt).toISOString() : new Date().toISOString();
    const dueAtValue = dueAt ? new Date(dueAt).toISOString() : issuedAtValue;
    const invoiceNumber = `INV-${String(businessId).slice(0, 8)}-${Date.now()}`;
    const snapshot = { customer, bills: billList, lineItems: baseLineItems };
    const publicToken = randomUUID();

    const { data: invoice, error: invoiceError } = await supabaseAdmin
      .from("invoices")
      .insert({
        business_id: businessId,
        customer_id: customerId,
        invoice_number: invoiceNumber,
        status: "draft",
        issued_at: issuedAtValue,
        due_at: dueAtValue,
        subtotal_cents: subtotalCents,
        tax_cents: taxCents,
        total_cents: totalCents,
        snapshot,
        public_token: publicToken,
      })
      .select("*")
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ error: invoiceError?.message || "Failed to create invoice" }, { status: 500 });
    }

    if (billIds.length > 0) {
      const linkRows = billIds.map((billId: string) => ({ invoice_id: invoice.id, bill_id: billId }));
      const { error: linkError } = await supabaseAdmin.from("invoice_bills").insert(linkRows);
      if (linkError) return NextResponse.json({ error: linkError.message, invoice }, { status: 500 });
      const nowIso = new Date().toISOString();
      await supabaseAdmin.from("bills").update({
        status: "billed",
        sent_at: nowIso,
        first_sent_at: nowIso,
        last_sent_at: nowIso,
      }).in("id", billIds).eq("business_id", businessId);
    }

    const lineItemRows = baseLineItems.map((item: { description: string; quantity?: number; unitPriceCents?: number; amountCents: number; sortOrder?: number; sourceType?: string; sourceId?: string }, index: number) => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity ?? null,
      unit_price_cents: item.unitPriceCents ?? null,
      amount_cents: item.amountCents,
      sort_order: item.sortOrder ?? index,
      source_type: item.sourceType ?? "manual",
      source_id: item.sourceId ?? null,
    }));
    const { error: lineError } = await supabaseAdmin.from("invoice_line_items").insert(lineItemRows);
    if (lineError) return NextResponse.json({ error: lineError.message, invoice }, { status: 500 });

    return NextResponse.json({ invoice }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("invoices")
      .delete()
      .eq("business_id", businessId)
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
