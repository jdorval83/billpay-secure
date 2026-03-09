import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

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

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;
  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json({ error: "SMS not configured" }, { status: 503 });
  }

  const baseUrl = getBaseUrl(request);
  let businesses: { id: string; reminder_interval_days?: number }[] = [];
  try {
    const { data } = await supabaseAdmin.from("businesses").select("id, reminder_interval_days");
    businesses = ((data || []) as { id: string; reminder_interval_days?: number }[]).filter((b) => (b.reminder_interval_days ?? 0) > 0);
  } catch {
    return NextResponse.json({ error: "Failed to load businesses" }, { status: 500 });
  }

  const twilio = (await import("twilio")).default;
  const client = twilio(accountSid, authToken);
  const today = new Date();
  let sent = 0;
  const errors: string[] = [];

  for (const biz of businesses) {
    const intervalDays = biz.reminder_interval_days ?? 1;
    const { data: bills } = await supabaseAdmin
      .from("bills")
      .select("id, balance_cents, due_date, business_id, customer_id, customers(name, phone, sms_consent_at)")
      .eq("business_id", biz.id)
      .in("status", ["billed", "past_due", "overdue", "finalized", "sent"])
      .gt("balance_cents", 0);

    const billList = (bills || []) as { id: string; balance_cents?: number; due_date: string; customer_id: string; customers?: { name?: string; phone?: string; sms_consent_at?: string | null } | { name?: string; phone?: string; sms_consent_at?: string | null }[] }[];

    for (const b of billList) {
      const cust = Array.isArray(b.customers) ? b.customers[0] : b.customers;
      const phone = (cust as { phone?: string } | undefined)?.phone ?? "";
      const hasConsent = !!(cust as { sms_consent_at?: string | null } | undefined)?.sms_consent_at;
      if (!phone || phone.replace(/\D/g, "").length < 10 || !hasConsent) continue;

      const { data: lastEvent } = await supabaseAdmin
        .from("bill_send_events")
        .select("sent_at")
        .eq("bill_id", b.id)
        .eq("channel", "sms")
        .order("sent_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const lastSent = lastEvent ? new Date((lastEvent as { sent_at: string }).sent_at) : null;
      const daysSinceLast = lastSent ? Math.floor((today.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24)) : 999;
      if (daysSinceLast < intervalDays) continue;

      const { data: link } = await supabaseAdmin.from("invoice_bills").select("invoice_id").eq("bill_id", b.id).limit(1);
      const invId = Array.isArray(link) && link[0] ? (link[0] as { invoice_id?: string }).invoice_id : null;
      if (!invId) continue;

      const { data: inv } = await supabaseAdmin.from("invoices").select("public_token, status").eq("id", invId).single();
      const token = (inv as { public_token?: string; status?: string } | null)?.public_token;
      const status = (inv as { status?: string } | null)?.status;
      if (!token || ["paid", "void"].includes(status || "")) continue;

      const paymentUrl = `${baseUrl}/public/invoices/${token}`;
      const amountStr = `$${(((b.balance_cents ?? 0) / 100)).toFixed(2)}`;
      const customerName = (cust as { name?: string })?.name ?? "Customer";

      try {
        await client.messages.create({
          body: `Hi ${customerName}, reminder: you have an outstanding balance of ${amountStr} (due ${b.due_date}). Pay here: ${paymentUrl}`,
          from: fromNumber,
          to: normalizePhone(phone),
        });
        sent++;
        await supabaseAdmin.from("bill_send_events").insert({
          business_id: biz.id,
          bill_id: b.id,
          customer_id: b.customer_id,
          sent_at: today.toISOString(),
          channel: "sms",
          recipient: phone,
          status: "sent",
        });
      } catch (err) {
        errors.push(`${b.id}: ${err instanceof Error ? err.message : "Send failed"}`);
      }
    }
  }

  return NextResponse.json({ sent, errors });
}
