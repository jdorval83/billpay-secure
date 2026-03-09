import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const baseSelect = "id, name, slug, subdomain, logo_url, support_email, invoice_footer, kind";
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select(`${baseSelect}, past_due_days`)
    .eq("id", businessId)
    .single();

  if (error) {
    if (error.message?.includes("past_due_days") || error.code === "42703") {
      const { data: fallback, error: err2 } = await supabaseAdmin
        .from("businesses")
        .select(baseSelect)
        .eq("id", businessId)
        .single();
      if (err2 || !fallback) {
        return NextResponse.json({ error: err2?.message || "Business not found" }, { status: 404 });
      }
      return NextResponse.json({ business: { ...fallback, past_due_days: 0 } });
    }
    return NextResponse.json({ error: error.message || "Business not found" }, { status: 404 });
  }

  if (!data) return NextResponse.json({ error: "Business not found" }, { status: 404 });
  return NextResponse.json({ business: data });
}

export async function PATCH(request: Request) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const body = await request.json().catch(() => ({}));
    const { logo_url, invoice_footer, support_email, past_due_days } = body as {
      logo_url?: string;
      invoice_footer?: string;
      support_email?: string;
      past_due_days?: number;
    };

    const update: Record<string, unknown> = {};
    if (typeof logo_url === "string") update.logo_url = logo_url;
    if (typeof invoice_footer === "string") update.invoice_footer = invoice_footer;
    if (typeof support_email === "string") update.support_email = support_email;
    if (typeof past_due_days === "number" && past_due_days >= 0) update.past_due_days = Math.min(365, Math.round(past_due_days));

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const selectCols = "id, name, slug, subdomain, logo_url, support_email, invoice_footer, kind";
    const { data, error } = await supabaseAdmin
      .from("businesses")
      .update(update)
      .eq("id", businessId)
      .select(`${selectCols}, past_due_days`)
      .single();

    if (error) {
      if (error.message?.includes("past_due_days") || error.code === "42703") {
        const updateWithoutPastDue = { ...update };
        delete updateWithoutPastDue.past_due_days;
        if (Object.keys(updateWithoutPastDue).length === 0) {
          return NextResponse.json({ error: "past_due_days column missing. Run migration 010_past_due_days.sql" }, { status: 500 });
        }
        const { data: d2, error: e2 } = await supabaseAdmin
          .from("businesses")
          .update(updateWithoutPastDue)
          .eq("id", businessId)
          .select(selectCols)
          .single();
        if (e2 || !d2) return NextResponse.json({ error: e2?.message || "Failed to update" }, { status: 500 });
        return NextResponse.json({ business: { ...d2, past_due_days: past_due_days ?? 0 } });
      }
      return NextResponse.json({ error: error.message || "Failed to update business" }, { status: 500 });
    }

    if (!data) return NextResponse.json({ error: "Failed to update business" }, { status: 500 });
    return NextResponse.json({ business: data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}

