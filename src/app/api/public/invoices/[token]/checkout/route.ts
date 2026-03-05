import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const currency = process.env.STRIPE_CURRENCY || "usd";

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: "2023-10-16",
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  const businessId = await getBusinessIdForRequest(_request);
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("business_id", businessId)
    .eq("public_token", token)
    .single();

  if (error || !invoice) {
    return NextResponse.json(
      { error: error?.message || "Invoice not found" },
      { status: 404 }
    );
  }

  if (invoice.status === "paid" || invoice.status === "written_off") {
    return NextResponse.json(
      { error: "Invoice is not payable" },
      { status: 400 }
    );
  }

  const baseUrl = appUrl.replace(/\/+$/, "");
  const successUrl = `${baseUrl}/public/invoices/${token}?paid=1`;
  const cancelUrl = `${baseUrl}/public/invoices/${token}?canceled=1`;

  const snapshotCustomer = (invoice.snapshot as any)?.customer || {};

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: snapshotCustomer.email || undefined,
    line_items: [
      {
        price_data: {
          currency,
          product_data: {
            name: invoice.invoice_number || "Invoice",
          },
          unit_amount: invoice.total_cents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      invoice_id: invoice.id,
      public_token: token,
      business_id: businessId,
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
}

