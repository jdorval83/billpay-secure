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

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const { id } = await params;
    if (!id) return NextResponse.json({ error: "Bill ID required" }, { status: 400 });

    const { data: bill, error: billErr } = await supabaseAdmin
      .from("bills")
      .select("id, balance_cents, due_date, description, business_id, customer_id, customers(name, phone, sms_consent_at)")
      .eq("id", id)
      .eq("business_id", businessId)
      .maybeSingle();

    if (billErr || !bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const cust = Array.isArray((bill as { customers?: unknown }).customers)
      ? ((bill as { customers?: unknown[] }).customers?.[0] as { phone?: string; sms_consent_at?: string | null } | undefined)
      : (bill as { customers?: { phone?: string; sms_consent_at?: string | null } }).customers;
    const phone = cust?.phone ?? "";
    const hasConsent = !!cust?.sms_consent_at;

    if (!phone || phone.replace(/\D/g, "").length < 10) {
      return NextResponse.json({ error: "Customer has no valid phone number" }, { status: 400 });
    }
    if (!hasConsent) {
      return NextResponse.json({ error: "Customer has not consented to SMS" }, { status: 400 });
    }

    const { data: links } = await supabaseAdmin
      .from("invoice_bills")
      .select("invoice_id")
      .eq("bill_id", id)
      .limit(1);
    const link = Array.isArray(links) && links.length > 0 ? links[0] : null;

    const invoiceId = (link as { invoice_id?: string } | null)?.invoice_id ?? null;
    if (!invoiceId) {
      return NextResponse.json({ error: "No sent bill (PDF) linked to this bill. Send the bill first." }, { status: 400 });
    }

    const { data: invoice } = await supabaseAdmin
      .from("invoices")
      .select("public_token, status")
      .eq("id", invoiceId)
      .single();

    const token = (invoice as { public_token?: string } | null)?.public_token;
    const status = (invoice as { status?: string } | null)?.status;
    if (!token || ["paid", "void"].includes(status || "")) {
      return NextResponse.json({ error: "Sent bill is no longer payable" }, { status: 400 });
    }

    const baseUrl = getBaseUrl(request);
    const paymentUrl = `${baseUrl}/public/invoices/${token}`;
    const amountStr = `$${(((bill as { balance_cents?: number }).balance_cents ?? 0) / 100).toFixed(2)}`;
    const customerName = (cust as { name?: string })?.name ?? "Customer";
    const dueDate = (bill as { due_date?: string }).due_date ?? "";

    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      return NextResponse.json(
        { error: "SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER." },
        { status: 503 }
      );
    }

    const twilio = (await import("twilio")).default;
    const client = twilio(accountSid, authToken);
    const to = normalizePhone(phone);
    const bodyText = `Hi ${customerName}, reminder: you have an outstanding balance of ${amountStr} (due ${dueDate}). Pay here: ${paymentUrl}`;

    await client.messages.create({
      body: bodyText,
      from: fromNumber,
      to,
    });

    const nowIso = new Date().toISOString();
    const billCustomerId = (bill as { customer_id?: string }).customer_id;
    await supabaseAdmin
      .from("bills")
      .update({ last_sent_at: nowIso, sent_at: nowIso })
      .eq("id", id)
      .eq("business_id", businessId);
    if (billCustomerId) {
      await supabaseAdmin.from("bill_send_events").insert({
        business_id: businessId,
        bill_id: id,
        customer_id: billCustomerId,
        sent_at: nowIso,
        channel: "sms",
        recipient: phone,
        status: "sent",
      });
    }

    return NextResponse.json({ success: true, message: "Payment link sent via text." });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to resend";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
