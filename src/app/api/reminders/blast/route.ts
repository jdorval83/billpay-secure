import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { data: bills } = await supabaseAdmin
    .from("bills")
    .select("id, amount_cents, balance_cents, due_date, description, customers(name, email)")
    .eq("business_id", businessId)
    .in("status", ["finalized", "billed", "sent"]);

  const outstanding = (bills || [])
    .filter((b: { balance_cents?: number }) => (b.balance_cents ?? 0) > 0)
    .map((b: { id: string; balance_cents: number; due_date: string; description?: string; customers?: { name?: string; email?: string } | null }) => ({
      billId: b.id,
      customerName: (b.customers as { name?: string })?.name ?? "",
      email: (b.customers as { email?: string })?.email ?? "",
      amountCents: b.balance_cents,
      dueDate: b.due_date,
      description: b.description ?? "",
    }))
    .filter((r: { email: string }) => r.email);

  return NextResponse.json({ outstanding });
}
