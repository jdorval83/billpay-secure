import { NextResponse } from "next/server";
import PDFDocument from "pdfkit";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

type RouteParams = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteParams) {
  const businessId = await getBusinessIdForRequest(request);
  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Invoice ID required" }, { status: 400 });
  }

  const [
    { data: invoice, error: invoiceError },
    { data: lineItems, error: lineItemsError },
    { data: business, error: businessError },
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

  const doc = new PDFDocument({ margin: 40 });
  const chunks: Buffer[] = [];

  doc.on("data", (chunk) => chunks.push(chunk));

  const pdfDone = new Promise<Buffer>((resolve, reject) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });

  const bizName = (business as any)?.name ?? "BillPay Secure";
  const supportEmail = (business as any)?.support_email ?? "support@billpaysecure.com";

  const issuedDate = invoice.issued_at
    ? new Date(invoice.issued_at as string).toLocaleDateString()
    : "";
  const dueDate = invoice.due_at
    ? new Date(invoice.due_at as string).toLocaleDateString()
    : "";

  doc.fontSize(18).text(bizName, { align: "left" });
  doc.fontSize(10).fillColor("#555555").text(supportEmail);
  doc.moveDown();

  doc
    .fontSize(16)
    .fillColor("#000000")
    .text(`Invoice ${invoice.invoice_number}`, { align: "right" });

  doc.moveDown();

  doc.fontSize(10).fillColor("#000000");
  doc.text("Bill to:", { continued: false });
  const customer =
    (invoice.customers as { name?: string | null; email?: string | null } | null) || null;
  const custName = customer?.name || (invoice.snapshot as any)?.customer?.name || "";
  const custEmail = customer?.email || (invoice.snapshot as any)?.customer?.email || "";
  doc.text(custName || "—");
  if (custEmail) doc.text(custEmail);

  doc.moveDown();

  const infoY = doc.y;
  doc.text("Invoice #:", 300, infoY);
  doc.text(String(invoice.invoice_number || ""), 380, infoY);
  doc.text("Issued:", 300, infoY + 12);
  doc.text(issuedDate || "—", 380, infoY + 12);
  doc.text("Due:", 300, infoY + 24);
  doc.text(dueDate || "—", 380, infoY + 24);

  doc.moveDown(3);

  // Table header
  doc.fontSize(11).fillColor("#000000").text("Description", 40);
  doc.text("Qty", 300, undefined, { width: 40, align: "right" });
  doc.text("Unit", 350, undefined, { width: 80, align: "right" });
  doc.text("Amount", 440, undefined, { width: 100, align: "right" });
  doc.moveTo(40, doc.y + 4).lineTo(540, doc.y + 4).stroke();
  doc.moveDown();

  const items =
    (lineItems as {
      id: string;
      description: string;
      quantity: number | null;
      unit_price_cents: number | null;
      amount_cents: number;
    }[]) || [];

  const toMoney = (cents: number | null | undefined) =>
    `$${((cents ?? 0) / 100).toFixed(2)}`;

  items.forEach((item) => {
    const y = doc.y;
    doc.fontSize(10).text(item.description || "Item", 40, y, { width: 240 });
    doc.text(item.quantity != null ? String(item.quantity) : "—", 300, y, {
      width: 40,
      align: "right",
    });
    doc.text(
      item.unit_price_cents != null ? toMoney(item.unit_price_cents) : "—",
      350,
      y,
      { width: 80, align: "right" }
    );
    doc.text(toMoney(item.amount_cents), 440, y, { width: 100, align: "right" });
    doc.moveDown();
  });

  doc.moveDown();
  doc.moveTo(300, doc.y).lineTo(540, doc.y).stroke();
  doc.moveDown(0.5);

  const subtotal = (invoice.subtotal_cents as number | null) ?? 0;
  const tax = (invoice.tax_cents as number | null) ?? 0;
  const total = (invoice.total_cents as number | null) ?? subtotal + tax;

  const summaryY = doc.y;
  doc.fontSize(10);
  doc.text("Subtotal", 320, summaryY, { width: 100, align: "right" });
  doc.text(toMoney(subtotal), 440, summaryY, { width: 100, align: "right" });
  doc.text("Tax", 320, summaryY + 12, { width: 100, align: "right" });
  doc.text(toMoney(tax), 440, summaryY + 12, { width: 100, align: "right" });
  doc.fontSize(11).font("Helvetica-Bold");
  doc.text("Total", 320, summaryY + 28, { width: 100, align: "right" });
  doc.text(toMoney(total), 440, summaryY + 28, { width: 100, align: "right" });

  doc.font("Helvetica").fontSize(9).fillColor("#555555");
  doc.moveDown(3);
  doc.text(
    (business as any)?.invoice_footer ||
      "Thank you for your business. Please contact support if you have any questions about this invoice."
  );

  doc.end();

  const pdfBuffer = await pdfDone;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Cache-Control": "private, no-cache, no-store",
      "Content-Disposition": `inline; filename="${String(
        invoice.invoice_number || "invoice"
      )}.pdf"`,
    },
  });
}

