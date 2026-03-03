import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { stripe } from "@/lib/stripe";

const BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return NextResponse.json({ error: "Bill ID required" }, { status: 400 });
  }

  const { data: bill, error: fetchError } = await supabaseAdmin
    .from("bills")
    .select("*, customers(name, email)")
    .eq("id", id)
    .eq("business_id", BUSINESS_ID)
    .single();

  if (fetchError || !bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  if (bill.status === "paid") {
    return NextResponse.json({ error: "Bill is already paid" }, { status: 400 });
  }

  // Return existing link if we have one
  if (bill.payment_link) {
    return NextResponse.json({ url: bill.payment_link });
  }

  try {
    const customerName = (bill.customers as { name?: string })?.name || "Customer";
    const customerEmail = (bill.customers as { email?: string | null })?.email;

    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: bill.description,
              description: `Invoice for ${customerName}`,
              metadata: { bill_id: bill.id },
            },
            unit_amount: bill.amount_cents,
          },
          quantity: 1,
        },
      ] as any,
      metadata: { bill_id: bill.id },
      after_completion: {
        type: "redirect",
        redirect: { url: `${APP_URL}/bills?paid=1` },
      },
      ...(customerEmail && {
        customer_creation: "always",
        allow_promotion_codes: true,
      }),
    });

    await supabaseAdmin
      .from("bills")
      .update({
        payment_link: paymentLink.url,
        status: bill.status === "draft" ? "sent" : bill.status,
        sent_at: new Date().toISOString(),
      })
      .eq("id", id);

    return NextResponse.json({ url: paymentLink.url });
  } catch (err) {
    console.error("[POST /api/bills/[id]/payment-link] Stripe error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to create payment link" },
      { status: 500 }
    );
  }
}
