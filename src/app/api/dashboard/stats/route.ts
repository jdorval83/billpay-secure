import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");
  const rawWeeks = searchParams.get("weeks");

  const { data: bills } = await supabaseAdmin
    .from("bills")
    .select("id, amount_cents, balance_cents, status, due_date, paid_at, created_at, first_sent_at, customer_id")
    .eq("business_id", businessId);

  const { data: customersData } = await supabaseAdmin
    .from("customers")
    .select("id, name")
    .eq("business_id", businessId);
  const customerMap = new Map((customersData || []).map((c: { id: string; name: string }) => [c.id, c.name]));

  let paymentRecords: { amount_cents: number; paid_at: string }[] = [];
  const prRes = await supabaseAdmin
    .from("payment_records")
    .select("id, amount_cents, paid_at")
    .eq("business_id", businessId);
  if (!prRes.error && prRes.data) {
    paymentRecords = prRes.data as { amount_cents: number; paid_at: string }[];
  }

  type BillRow = { amount_cents: number; balance_cents: number; status: string; paid_at: string | null; due_date: string; created_at: string; first_sent_at?: string | null; customer_id?: string };
  const billList = (bills || []) as BillRow[];
  const records = paymentRecords;

  const totalOutstanding = billList
    .filter((b) => (b.status || "").toLowerCase() !== "void" && (b.balance_cents ?? 0) > 0)
    .reduce((s, b) => s + (b.balance_cents || 0), 0);

  const now = new Date();
  let rangeEnd = toParam ? new Date(toParam + "T23:59:59") : new Date(now);
  let rangeStart = fromParam
    ? new Date(fromParam + "T00:00:00")
    : new Date(rangeEnd);
  if (!fromParam) {
    const weeksParam = Math.min(26, Math.max(1, parseInt(rawWeeks || "4", 10)));
    rangeStart.setDate(rangeStart.getDate() - (weeksParam - 1) * 7);
    rangeStart.setHours(0, 0, 0, 0);
  }
  const rangeStartISO = rangeStart.toISOString();
  const rangeEndISO = rangeEnd.toISOString();
  const rangeStartYMD = rangeStartISO.slice(0, 10);
  const rangeEndYMD = rangeEndISO.slice(0, 10);

  const billedInPeriod = billList
    .filter((b) => b.created_at >= rangeStartISO && b.created_at <= rangeEndISO)
    .reduce((s, b) => s + (b.amount_cents || 0), 0);
  const paidBillsInPeriod = billList.filter(
    (b) => (b.status || "").toLowerCase() === "paid" && b.paid_at && b.paid_at >= rangeStartISO && b.paid_at <= rangeEndISO
  );
  const paymentsFromBillsInPeriod = paidBillsInPeriod.reduce((s, b) => s + (b.amount_cents || 0), 0);
  const paymentsFromRecordsInPeriod = records
    .filter((r) => r.paid_at >= rangeStartYMD && r.paid_at <= rangeEndYMD)
    .reduce((s, r) => s + (r.amount_cents || 0), 0);
  const paymentsInPeriod = paymentsFromBillsInPeriod + paymentsFromRecordsInPeriod;

  const daysToRemitByCustomer = new Map<string, { totalDays: number; count: number }>();
  for (const b of billList) {
    if ((b.status || "").toLowerCase() !== "paid" || !b.paid_at) continue;
    const startDate = b.first_sent_at || b.created_at;
    if (!startDate) continue;
    const start = new Date(startDate).getTime();
    const paid = new Date(b.paid_at).getTime();
    const days = Math.round((paid - start) / (1000 * 60 * 60 * 24));
    const cid = b.customer_id || "";
    if (!cid) continue;
    const existing = daysToRemitByCustomer.get(cid) || { totalDays: 0, count: 0 };
    daysToRemitByCustomer.set(cid, { totalDays: existing.totalDays + days, count: existing.count + 1 });
  }
  const daysToRemit = Array.from(daysToRemitByCustomer.entries()).map(([customerId, { totalDays, count }]) => ({
    customerId,
    customerName: customerMap.get(customerId) || "—",
    avgDaysToRemit: Math.round(totalDays / count),
    billCount: count,
  })).sort((a, b) => a.avgDaysToRemit - b.avgDaysToRemit);

  const weeksParam = fromParam && toParam
    ? Math.ceil((rangeEnd.getTime() - rangeStart.getTime()) / (7 * 24 * 60 * 60 * 1000)) || 4
    : Math.min(26, Math.max(1, parseInt(rawWeeks || "4", 10)));
  const weeks: { week: string; label: string; charges: number; payments: number }[] = [];
  for (let i = weeksParam - 1; i >= 0; i--) {
    const weekEnd = new Date(rangeEnd);
    weekEnd.setDate(weekEnd.getDate() - i * 7);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);
    weekStart.setHours(0, 0, 0, 0);
    weekEnd.setHours(23, 59, 59, 999);
    const start = weekStart.toISOString();
    const end = weekEnd.toISOString();
    const startYMD = start.slice(0, 10);
    const endYMD = end.slice(0, 10);
    const chargesThisWeek = billList.filter(
      (b) => b.created_at >= start && b.created_at <= end
    ).reduce((s, b) => s + (b.amount_cents || 0), 0);
    const paidThisWeek = billList.filter(
      (b) => b.paid_at && b.paid_at >= start && b.paid_at <= end
    ).reduce((s, b) => s + (b.amount_cents || 0), 0);
    const recordedThisWeek = records.filter(
      (r) => r.paid_at >= startYMD && r.paid_at <= endYMD
    ).reduce((s, r) => s + (r.amount_cents || 0), 0);
    weeks.push({
      week: startYMD,
      label: `${startYMD} – ${endYMD}`,
      charges: chargesThisWeek,
      payments: paidThisWeek + recordedThisWeek,
    });
  }

  const agingBuckets = [
    { bucket: "Current", min: -Infinity, max: 0 },
    { bucket: "1-7", min: 1, max: 7 },
    { bucket: "8-14", min: 8, max: 14 },
    { bucket: "15-21", min: 15, max: 21 },
    { bucket: "22-30", min: 22, max: 30 },
    { bucket: "31+", min: 31, max: Infinity },
  ];
  const today = new Date();
  const aging = agingBuckets.map(({ bucket, min, max }) => {
    const amount = billList
      .filter((b) => {
        if ((b.status || "").toLowerCase() === "paid" || (b.status || "").toLowerCase() === "written_off" || (b.status || "").toLowerCase() === "void") return false;
        const due = new Date(b.due_date + "T00:00:00");
        const days = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
        return days >= min && days <= max;
      })
      .reduce((s, b) => s + (b.balance_cents || 0), 0);
    return { bucket, amountCents: amount };
  });

  return NextResponse.json({
    totalOutstanding,
    billedInPeriod,
    paymentsInPeriod,
    daysToRemit,
    byWeek: weeks,
    aging,
    rangeFrom: rangeStart.toISOString().slice(0, 10),
    rangeTo: rangeEnd.toISOString().slice(0, 10),
  });
}
