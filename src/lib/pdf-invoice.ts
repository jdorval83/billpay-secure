import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const toMoney = (cents: number | null | undefined) =>
  "$" + ((cents ?? 0) / 100).toFixed(2);

type InvoiceRow = {
  description?: string;
  quantity?: number | null;
  unit_price_cents?: number | null;
  amount_cents?: number;
};

type InvoiceData = {
  invoice_number?: string;
  issued_at?: string | null;
  due_at?: string | null;
  subtotal_cents?: number | null;
  tax_cents?: number | null;
  total_cents?: number | null;
  customers?: { name?: string; email?: string; address_line1?: string; address_line2?: string; city?: string; state?: string; postal_code?: string } | null;
  snapshot?: { customer?: { name?: string; email?: string; address_line1?: string; address_line2?: string; city?: string; state?: string; postal_code?: string } };
};

type BusinessData = {
  name?: string;
  support_email?: string;
  invoice_footer?: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  phone?: string | null;
  website?: string | null;
  logo_url?: string | null;
};

export async function generateInvoicePdf(
  invoice: InvoiceData,
  lineItems: InvoiceRow[],
  business: BusinessData | null
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const { width, height } = page.getSize();
  const helvetica = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const bizName = business?.name ?? "BillPay Secure";
  const supportEmail = business?.support_email ?? "";
  const bizAddr1 = business?.address_line1 || "";
  const bizAddr2 = business?.address_line2 || "";
  const bizCity = [business?.city, business?.state, business?.postal_code].filter(Boolean).join(", ");
  const bizPhone = business?.phone || "";
  const bizWebsite = business?.website || "";

  const issuedDate = invoice.issued_at
    ? new Date(invoice.issued_at).toLocaleDateString()
    : "—";
  const dueDate = invoice.due_at
    ? new Date(invoice.due_at).toLocaleDateString()
    : "—";

  let y = height - 50;

  page.drawText(bizName, { x: 50, y, size: 18, font: helveticaBold, color: rgb(0, 0, 0) });
  y -= 14;
  if (supportEmail) {
    page.drawText(supportEmail, { x: 50, y, size: 10, font: helvetica, color: rgb(0.33, 0.33, 0.33) });
    y -= 14;
  }
  if (bizAddr1 || bizCity) {
    if (bizAddr1) {
      page.drawText(bizAddr1.slice(0, 50), { x: 50, y, size: 9, font: helvetica, color: rgb(0.33, 0.33, 0.33) });
      y -= 12;
    }
    if (bizAddr2) {
      page.drawText(bizAddr2.slice(0, 50), { x: 50, y, size: 9, font: helvetica, color: rgb(0.33, 0.33, 0.33) });
      y -= 12;
    }
    if (bizCity) {
      page.drawText(bizCity.slice(0, 50), { x: 50, y, size: 9, font: helvetica, color: rgb(0.33, 0.33, 0.33) });
      y -= 12;
    }
  }
  if (bizPhone) {
    page.drawText(bizPhone.slice(0, 30), { x: 50, y, size: 9, font: helvetica, color: rgb(0.33, 0.33, 0.33) });
    y -= 12;
  }
  if (bizWebsite) {
    page.drawText(bizWebsite.slice(0, 40), { x: 50, y, size: 9, font: helvetica, color: rgb(0.33, 0.33, 0.33) });
    y -= 14;
  }
  y -= 10;

  page.drawText(`Bill ${invoice.invoice_number}`, {
    x: width - 150,
    y,
    size: 16,
    font: helveticaBold,
    color: rgb(0, 0, 0),
  });
  y -= 24;

  const customer = invoice.customers || invoice.snapshot?.customer;
  const custName = customer?.name || "—";
  const custEmail = customer?.email || "";
  const addrLine1 = customer?.address_line1 || "";
  const addrLine2 = customer?.address_line2 || "";
  const addrCity = [customer?.city, customer?.state, customer?.postal_code].filter(Boolean).join(", ");

  page.drawText("Bill to:", { x: 50, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
  y -= 14;
  page.drawText(custName, { x: 50, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
  y -= 14;
  if (custEmail) {
    page.drawText(custEmail, { x: 50, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
    y -= 14;
  }
  if (addrLine1 || addrCity) {
    if (addrLine1) {
      page.drawText(addrLine1.slice(0, 50), { x: 50, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
      y -= 14;
    }
    if (addrLine2) {
      page.drawText(addrLine2.slice(0, 50), { x: 50, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
      y -= 14;
    }
    if (addrCity) {
      page.drawText(addrCity.slice(0, 50), { x: 50, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
      y -= 14;
    }
  }
  y -= 16;

  page.drawText(`Bill #: ${invoice.invoice_number}`, { x: 350, y: y + 28, size: 10, font: helvetica, color: rgb(0, 0, 0) });
  page.drawText(`Issued: ${issuedDate}`, { x: 350, y: y + 14, size: 10, font: helvetica, color: rgb(0, 0, 0) });
  page.drawText(`Due: ${dueDate}`, { x: 350, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
  y -= 32;

  page.drawLine({ start: { x: 50, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 20;

  page.drawText("Description", { x: 50, y, size: 11, font: helveticaBold, color: rgb(0, 0, 0) });
  page.drawText("Qty", { x: 310, y, size: 11, font: helveticaBold, color: rgb(0, 0, 0) });
  page.drawText("Unit", { x: 360, y, size: 11, font: helveticaBold, color: rgb(0, 0, 0) });
  page.drawText("Amount", { x: 450, y, size: 11, font: helveticaBold, color: rgb(0, 0, 0) });
  y -= 20;

  for (const item of lineItems) {
    page.drawText((item.description || "Item").slice(0, 60), { x: 50, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
    page.drawText(String(item.quantity ?? "—"), { x: 320, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
    page.drawText(item.unit_price_cents != null ? toMoney(item.unit_price_cents) : "—", { x: 360, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
    page.drawText(toMoney(item.amount_cents), { x: 450, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
    y -= 16;
  }

  y -= 8;
  page.drawLine({ start: { x: 300, y }, end: { x: width - 50, y }, thickness: 1, color: rgb(0.8, 0.8, 0.8) });
  y -= 16;

  const subtotal = invoice.subtotal_cents ?? 0;
  const tax = invoice.tax_cents ?? 0;
  const total = invoice.total_cents ?? subtotal + tax;

  page.drawText("Subtotal", { x: 320, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
  page.drawText(toMoney(subtotal), { x: 450, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
  y -= 14;
  page.drawText("Tax", { x: 320, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
  page.drawText(toMoney(tax), { x: 450, y, size: 10, font: helvetica, color: rgb(0, 0, 0) });
  y -= 20;
  page.drawText("Total", { x: 320, y, size: 11, font: helveticaBold, color: rgb(0, 0, 0) });
  page.drawText(toMoney(total), { x: 450, y, size: 11, font: helveticaBold, color: rgb(0, 0, 0) });
  y -= 32;

  const footer = business?.invoice_footer || "Thank you for your business. Please contact support if you have any questions about this bill.";
  page.drawText(footer.slice(0, 120), { x: 50, y, size: 9, font: helvetica, color: rgb(0.33, 0.33, 0.33) });

  return pdfDoc.save();
}
