import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";
import { toCsv } from "@/lib/reports/csv";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const customerId = url.searchParams.get("customerId");
  let query = supabaseAdmin
    .from("bill_send_events")
    .select("bill_id, invoice_id, customer_id, sent_at, channel, recipient, status, message_id, error_message, bills(description), customers(name)")
    .eq("business_id", businessId);
  if (customerId) query = query.eq("customer_id", customerId);
  if (from) query = query.gte("sent_at", from);
  if (to) query = query.lte("sent_at", to);
  const { data, error } = await query;
  if (error) return new NextResponse(error.message, { status: 500 });
  const rows = (data || []).map((e: { bill_id?: string; invoice_id?: string; customer_id?: string; sent_at?: string; channel?: string; recipient?: string; status?: string; message_id?: string; error_message?: string; bills?: { description?: string } | null; customers?: { name?: string } | null }) => ({
    sentAt: e.sent_at,
    channel: e.channel,
    recipient: e.recipient,
    status: e.status,
    billId: e.bill_id,
    billDescription: (e.bills as { description?: string } | null)?.description ?? "",
    customerName: (e.customers as { name?: string } | null)?.name ?? "",
    customerId: e.customer_id,
    invoiceId: e.invoice_id,
    messageId: e.message_id,
    errorMessage: e.error_message,
  }));
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="send-history.csv"',
    },
  });
}
