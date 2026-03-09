import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);

  const { data: bills } = await supabaseAdmin
    .from("bills")
    .select("id, amount_cents, balance_cents, status, due_date, paid_at, created_at")
    .eq("business_id", businessId);

  let paymentRecords: { amount_cents: number; paid_at: string }[] = [];
  const prRes = await supabaseAdmin
    .from("payment_records")
    .select("id, amount_cents, paid_at")
    .eq("business_id", businessId);
  if (!prRes.error && prRes.data) {
    paymentRecords = prRes.data as { amount_cents: number; paid_at: string }[];
  }

  const billList = (bills || []) as { amount_cents: number; balance_cents: number; status: string; paid_at: string | null; due_date: string; created_at: string }[];
  const records = paymentRecords;

  const totalCharges = billList.reduce((s, b) => s + (b.amount_cents || 0), 0);
  const totalOutstanding = billList
    .filter((b) => (b.status || "").toLowerCase() !== "void" && (b.balance_cents ?? 0) > 0)
    .reduce((s, b) => s + (b.balance_cents || 0), 0);
  const totalPayments = billList
    .filter((b) => (b.status || "").toLowerCase() === "paid")
    .reduce((s, b) => s + (b.amount_cents || 0), 0);
  const totalRecordedPayments = records.reduce((s, r) => s + (r.amount_cents || 0), 0);
  const totalPaymentsAll = totalPayments + totalRecordedPayments;

  const now = new Date();
  const weeks: { week: string; label: string; charges: number; payments: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const weekEnd = new Date(now);
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
    totalCharges,
    totalPayments: totalPaymentsAll,
    totalOutstanding,
    byWeek: weeks,
    aging,
  });
}
