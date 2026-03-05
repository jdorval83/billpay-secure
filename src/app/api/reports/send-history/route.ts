import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { toCsv } from "@/lib/reports/csv";

const BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const customerId = url.searchParams.get("customerId");
  let query = supabaseAdmin
    .from("bill_send_events")
    .select("bill_id, invoice_id, customer_id, sent_at, channel, recipient, status, message_id, error_message")
    .eq("business_id", BUSINESS_ID);
  if (customerId) query = query.eq("customer_id", customerId);
  if (from) query = query.gte("sent_at", from);
  if (to) query = query.lte("sent_at", to);
  const { data, error } = await query;
  if (error) return new NextResponse(error.message, { status: 500 });
  const rows = (data || []).map((e) => ({
    billId: e.bill_id,
    invoiceId: e.invoice_id,
    customerId: e.customer_id,
    sentAt: e.sent_at,
    channel: e.channel,
    recipient: e.recipient,
    status: e.status,
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
