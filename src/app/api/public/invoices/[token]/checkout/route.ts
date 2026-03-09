import { NextResponse } from "next/server";
import Stripe from "stripe";
import { supabaseAdmin } from "@/lib/supabase";

const stripeSecretKey = (process.env.STRIPE_SECRET_KEY || "").trim();
const currency = process.env.STRIPE_CURRENCY || "usd";

function getBaseUrl(request: Request): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl.replace(/\/+$/, "");
  const host = request.headers.get("host") || "";
  const proto = request.headers.get("x-forwarded-proto") || (host.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

if (!stripeSecretKey) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}
// Ensure no trailing whitespace/newlines that break Stripe SDK
const stripe = new Stripe(stripeSecretKey);

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
  const { token } = await params;
  if (!token) {
    return NextResponse.json({ error: "Token required" }, { status: 400 });
  }

  const { data: invoice, error } = await supabaseAdmin
    .from("invoices")
    .select("*")
    .eq("public_token", token)
    .single();

  if (error || !invoice) {
    return NextResponse.json(
      { error: error?.message || "Invoice not found" },
      { status: 404 }
    );
  }

  if (["paid", "written_off", "void"].includes(String(invoice.status || ""))) {
    return NextResponse.json(
      { error: "Invoice is not payable" },
      { status: 400 }
    );
  }

  const totalCents = Number(invoice.total_cents);
  if (!Number.isFinite(totalCents) || totalCents <= 0) {
    return NextResponse.json(
      { error: "Invoice has invalid total" },
      { status: 400 }
    );
  }

  const baseUrl = getBaseUrl(_request);
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
            name: invoice.invoice_number || "Bill",
          },
          unit_amount: totalCents,
        },
        quantity: 1,
      },
    ],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: {
      invoice_id: invoice.id,
      public_token: token,
      business_id: invoice.business_id,
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }

  return NextResponse.redirect(session.url, { status: 303 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

