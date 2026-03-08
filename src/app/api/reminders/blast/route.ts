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

  const billList = (bills || []) as { id: string; balance_cents?: number; due_date: string; description?: string; customers?: { name?: string; email?: string } | { name?: string; email?: string }[] }[];
  const outstanding = billList
    .filter((b) => (b.balance_cents ?? 0) > 0)
    .map((b) => {
      const cust = Array.isArray(b.customers) ? b.customers[0] : b.customers;
      const email = (cust as { email?: string } | undefined)?.email ?? "";
      return {
        billId: b.id,
        customerName: (cust as { name?: string } | undefined)?.name ?? "",
        email,
        amountCents: b.balance_cents ?? 0,
        dueDate: b.due_date,
        description: b.description ?? "",
      };
    })
    .filter((r) => r.email);

  return NextResponse.json({ outstanding });
}
