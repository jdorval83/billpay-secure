import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}
if (!webhookSecret) {
  throw new Error("STRIPE_WEBHOOK_SECRET is not set");
}

const stripe = new Stripe(stripeSecretKey);

export async function POST(req: NextRequest) {
  const sig = req.headers.get("stripe-signature");
  if (!sig) {
    return NextResponse.json({ error: "Missing Stripe signature" }, { status: 400 });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const invoiceId = metadata.invoice_id as string | undefined;
    const businessId = (metadata.business_id as string | undefined) ?? undefined;

    if (session.payment_status === "paid" && invoiceId) {
      const nowIso = new Date().toISOString();

      // Mark invoice as paid
      const { error: invoiceError } = await supabaseAdmin
        .from("invoices")
        .update({ status: "paid" })
        .eq("business_id", businessId || undefined)
        .eq("id", invoiceId);

      if (invoiceError) {
        // eslint-disable-next-line no-console
        console.error("[stripe webhook] Failed to update invoice:", invoiceError.message);
      }

      // Find linked bills
      const { data: links, error: linksError } = await supabaseAdmin
        .from("invoice_bills")
        .select("bill_id")
        .eq("invoice_id", invoiceId);

      if (!linksError && links && links.length > 0) {
        const billIds = links.map((l) => l.bill_id);
        const { error: billsError } = await supabaseAdmin
          .from("bills")
          .update({
            status: "paid",
            paid_at: nowIso,
            balance_cents: 0,
          })
          .eq("business_id", businessId || undefined)
          .in("id", billIds);

        if (billsError) {
          // eslint-disable-next-line no-console
          console.error("[stripe webhook] Failed to update bills:", billsError.message);
        }
      }
    }
  }

  return NextResponse.json({ received: true });
}

