import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { supabaseAdmin } from "@/lib/supabase";

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(request: Request) {
  if (!webhookSecret) {
    console.error("[webhooks/stripe] STRIPE_WEBHOOK_SECRET not set");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  const body = await request.text();
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: { type: string; data: { object: { metadata?: { bill_id?: string } } } };
  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret) as typeof event;
  } catch (err) {
    console.error("[webhooks/stripe] Signature verification failed:", err);
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as { metadata?: { bill_id?: string } };
    const billId = session.metadata?.bill_id;
    if (!billId) {
      console.warn("[webhooks/stripe] checkout.session.completed missing bill_id in metadata");
      return NextResponse.json({ received: true });
    }

    const { error } = await supabaseAdmin
      .from("bills")
      .update({
        status: "paid",
        balance_cents: 0,
        paid_at: new Date().toISOString(),
      })
      .eq("id", billId);

    if (error) {
      console.error("[webhooks/stripe] Failed to update bill:", error);
    }
  }

  return NextResponse.json({ received: true });
}
