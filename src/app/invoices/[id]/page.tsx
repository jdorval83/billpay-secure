import Link from "next/link";
import { headers } from "next/headers";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdFromHost } from "@/lib/tenant";
import { notFound } from "next/navigation";

const formatMoney = (cents: number | null | undefined) =>
  "$" + ((cents ?? 0) / 100).toLocaleString("en-US", { minimumFractionDigits: 2 });

type PageParams = {
  params: Promise<{ id: string }>;
};

export default async function InvoiceDetailPage({ params }: PageParams) {
  const { id } = await params;
  const host = (await headers()).get("host");
  const businessId = await getBusinessIdFromHost(host);

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
    notFound();
  }
  if (lineItemsError || linksError) {
    throw new Error(lineItemsError?.message || linksError?.message);
  }

  const { data: business } = await supabaseAdmin
    .from("businesses")
    .select("*")
    .eq("id", businessId)
    .single();

  const typedLineItems =
    (lineItems as { id: string; description: string; quantity: number | null; unit_price_cents: number | null; amount_cents: number }[]) || [];

  const total = invoice.total_cents as number | null | undefined;
  const subtotal = invoice.subtotal_cents as number | null | undefined;
  const tax = invoice.tax_cents as number | null | undefined;

  const customerFromSnapshot =
    (invoice.snapshot as any)?.customer || {};

  const customer = {
    name:
      (invoice.customers as { name?: string | null } | null)?.name ??
      customerFromSnapshot.name ??
      "",
    email:
      (invoice.customers as { email?: string | null } | null)?.email ??
      customerFromSnapshot.email ??
      "",
    phone: customerFromSnapshot.phone ?? "",
  };

  const issuedDate = invoice.issued_at
    ? new Date(invoice.issued_at as string).toLocaleDateString()
    : "—";
  const dueDate = invoice.due_at
    ? new Date(invoice.due_at as string).toLocaleDateString()
    : "—";

  const publicToken = (invoice.public_token as string | null) || null;

  return (
    <main className="page-container">
      <div className="content-max">
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-1">
              Invoice {invoice.invoice_number}
            </h1>
            <p className="text-sm text-slate-500">
              Status: <span className="font-medium text-slate-800">{invoice.status}</span>
            </p>
            {business ? (
              <p className="mt-1 text-xs text-slate-500">
                Business:{" "}
                <span className="font-medium text-slate-800">{business.name}</span>
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={`/api/invoices/${id}/pdf`} className="btn-secondary">
              Download PDF
            </a>
            {publicToken && invoice.status !== "paid" && invoice.status !== "void" ? (
              <a href={`/api/public/invoices/${publicToken}/checkout`} className="btn-primary">
                Pay now
              </a>
            ) : null}
          </div>
        </div>

        <div className="card p-8 space-y-8">
          <div className="flex flex-wrap justify-between gap-8">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                From
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {business?.name ?? "—"}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Billing and AR for service businesses
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Bill to
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {customer.name || "—"}
              </p>
              {customer.email ? (
                <p className="text-xs text-slate-500 mt-1">{customer.email}</p>
              ) : null}
              {customer.phone ? (
                <p className="text-xs text-slate-500">{customer.phone}</p>
              ) : null}
            </div>
            <div className="text-sm text-slate-600 space-y-1">
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Invoice #</span>
                <span className="font-medium text-slate-900">
                  {invoice.invoice_number}
                </span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Issued</span>
                <span>{issuedDate}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-500">Due</span>
                <span>{dueDate}</span>
              </div>
            </div>
          </div>

          <div className="overflow-hidden rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="p-3 font-semibold text-slate-700">Description</th>
                  <th className="p-3 font-semibold text-slate-700 w-24 text-center">
                    Qty
                  </th>
                  <th className="p-3 font-semibold text-slate-700 w-32 text-right">
                    Unit price
                  </th>
                  <th className="p-3 font-semibold text-slate-700 w-32 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {typedLineItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="p-4 text-sm text-slate-500 text-center"
                    >
                      No line items.
                    </td>
                  </tr>
                ) : (
                  typedLineItems.map((item) => (
                    <tr key={item.id} className="border-b border-slate-100">
                      <td className="p-3 text-slate-800">{item.description}</td>
                      <td className="p-3 text-center text-slate-600">
                        {item.quantity ?? "—"}
                      </td>
                      <td className="p-3 text-right text-slate-600">
                        {item.unit_price_cents != null
                          ? formatMoney(item.unit_price_cents)
                          : "—"}
                      </td>
                      <td className="p-3 text-right font-medium text-slate-900">
                        {formatMoney(item.amount_cents)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap justify-end gap-8">
            <div className="w-full sm:w-64 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Subtotal</span>
                <span className="font-medium text-slate-900">
                  {formatMoney(subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Tax</span>
                <span className="font-medium text-slate-900">
                  {formatMoney(tax)}
                </span>
              </div>
              <div className="border-t border-slate-200 pt-2 mt-1 flex justify-between">
                <span className="text-slate-700 font-semibold">Total due</span>
                <span className="text-lg font-bold text-slate-900">
                  {formatMoney(total)}
                </span>
              </div>
            </div>
          </div>

          {publicToken && invoice.status !== "paid" && invoice.status !== "void" ? (
            <p className="text-xs text-slate-500">
              Share link:{" "}
              <span className="font-mono text-slate-600 break-all">
                {host ? `https://${host}` : ""}/public/invoices/{publicToken}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}

