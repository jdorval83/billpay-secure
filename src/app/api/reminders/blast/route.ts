import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

function getBaseUrl(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { data: bills } = await supabaseAdmin
    .from("bills")
    .select("id, amount_cents, balance_cents, due_date, description, customers(name, phone, sms_consent_at)")
    .eq("business_id", businessId)
    .in("status", ["billed", "past_due", "finalized", "sent"]);

  const billList = (bills || []) as { id: string; balance_cents?: number; due_date: string; description?: string; customers?: { name?: string; phone?: string; sms_consent_at?: string | null } | { name?: string; phone?: string; sms_consent_at?: string | null }[] }[];
  const baseUrl = getBaseUrl(request);

  const outstanding = await Promise.all(
    billList
      .filter((b) => (b.balance_cents ?? 0) > 0)
      .map(async (b) => {
        const cust = Array.isArray(b.customers) ? b.customers[0] : b.customers;
        const phone = (cust as { phone?: string } | undefined)?.phone ?? "";
        const hasConsent = !!(cust as { sms_consent_at?: string | null } | undefined)?.sms_consent_at;
        let paymentUrl = "";
        const { data: link } = await supabaseAdmin.from("invoice_bills").select("invoice_id").eq("bill_id", b.id).limit(1);
        const invId = Array.isArray(link) && link[0] ? (link[0] as { invoice_id?: string }).invoice_id : null;
        if (invId) {
          const { data: inv } = await supabaseAdmin.from("invoices").select("public_token, status").eq("id", invId).single();
          const token = (inv as { public_token?: string; status?: string } | null)?.public_token;
          const status = (inv as { status?: string } | null)?.status;
          if (token && status && !["paid", "void"].includes(status)) {
            paymentUrl = `${baseUrl}/public/invoices/${token}`;
          }
        }
        return {
          billId: b.id,
          customerName: (cust as { name?: string } | undefined)?.name ?? "",
          phone: phone.replace(/\D/g, "").length >= 10 ? phone : "",
          amountCents: b.balance_cents ?? 0,
          dueDate: b.due_date,
          description: b.description ?? "",
          hasConsent,
          paymentUrl,
        };
      })
  );

  const filtered = outstanding.filter((r) => r.phone && r.hasConsent);
  return NextResponse.json({ outstanding: filtered });
}
