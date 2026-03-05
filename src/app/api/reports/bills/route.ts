import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { toCsv } from "@/lib/reports/csv";

const BUSINESS_ID = "00000000-0000-0000-0000-000000000001";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  let query = supabaseAdmin
    .from("bills")
    .select("id, customer_id, status, amount_cents, created_at, due_date, first_sent_at, last_sent_at")
    .eq("business_id", BUSINESS_ID);
  if (from) query = query.gte("created_at", from);
  if (to) query = query.lte("created_at", to);
  const { data, error } = await query;
  if (error) return new NextResponse(error.message, { status: 500 });
  const rows = (data || []).map((b) => ({
    billId: b.id,
    customerId: b.customer_id,
    status: b.status,
    total: (b.amount_cents ?? 0) / 100,
    issuedAt: b.created_at,
    dueAt: b.due_date,
    firstSentAt: b.first_sent_at,
    lastSentAt: b.last_sent_at,
  }));
  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="bills.csv"',
    },
  });
}
