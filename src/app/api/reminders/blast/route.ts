import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { data: bills } = await supabaseAdmin
    .from("bills")
    .select("id, amount_cents, balance_cents, due_date, description, customers(name, phone, sms_consent_at)")
    .eq("business_id", businessId)
    .in("status", ["billed", "sent"]);

  const billList = (bills || []) as { id: string; balance_cents?: number; due_date: string; description?: string; customers?: { name?: string; phone?: string; sms_consent_at?: string | null } | { name?: string; phone?: string; sms_consent_at?: string | null }[] }[];
  const outstanding = billList
    .filter((b) => (b.balance_cents ?? 0) > 0)
    .map((b) => {
      const cust = Array.isArray(b.customers) ? b.customers[0] : b.customers;
      const phone = (cust as { phone?: string } | undefined)?.phone ?? "";
      const hasConsent = !!(cust as { sms_consent_at?: string | null } | undefined)?.sms_consent_at;
      return {
        billId: b.id,
        customerName: (cust as { name?: string } | undefined)?.name ?? "",
        phone: phone.replace(/\D/g, "").length >= 10 ? phone : "",
        amountCents: b.balance_cents ?? 0,
        dueDate: b.due_date,
        description: b.description ?? "",
        hasConsent,
      };
    })
    .filter((r) => r.phone && r.hasConsent);

  return NextResponse.json({ outstanding });
}
