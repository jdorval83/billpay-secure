import { NextResponse } from "next/server";
import { getBusinessIdForRequest } from "@/lib/tenant";

type Recipient = { phone: string; customerName: string; amountCents: number; dueDate: string; paymentUrl?: string };

function normalizePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits ? `+${digits}` : "";
}

export async function POST(request: Request) {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    return NextResponse.json(
      { error: "SMS not configured. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in environment." },
      { status: 503 }
    );
  }

  const businessId = await getBusinessIdForRequest(request);
  let body: { recipients?: Recipient[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const recipients = Array.isArray(body?.recipients) ? body.recipients : [];
  if (recipients.length === 0) {
    return NextResponse.json({ error: "No recipients" }, { status: 400 });
  }

  const twilio = (await import("twilio")).default;
  const client = twilio(accountSid, authToken);

  const results: { phone: string; ok: boolean; error?: string }[] = [];
  const amountStr = (cents: number) => `$${(cents / 100).toFixed(2)}`;

  for (const r of recipients) {
    const to = normalizePhone(r.phone);
    if (!to || to.length < 10) {
      results.push({ phone: r.phone, ok: false, error: "Invalid phone" });
      continue;
    }
    const bodyText = r.paymentUrl
      ? `Hi ${r.customerName}, reminder: you have an outstanding balance of ${amountStr(r.amountCents)} (due ${r.dueDate}). Pay here: ${r.paymentUrl}`
      : `Hi ${r.customerName}, this is a friendly reminder that you have an outstanding balance of ${amountStr(r.amountCents)} (due ${r.dueDate}). Please reach out if you have questions.`;

    try {
      await client.messages.create({
        body: bodyText,
        from: fromNumber,
        to,
      });
      results.push({ phone: r.phone, ok: true });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Send failed";
      results.push({ phone: r.phone, ok: false, error: msg });
    }
  }

  const okCount = results.filter((r) => r.ok).length;
  return NextResponse.json({
    sent: okCount,
    total: results.length,
    results,
  });
}
