import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const baseSelect = "id, name, slug, subdomain, logo_url, support_email, invoice_footer, kind";
  const { data, error } = await supabaseAdmin
    .from("businesses")
    .select(`${baseSelect}, past_due_days, reminder_interval_days`)
    .eq("id", businessId)
    .single();

  if (error) {
    if (error.message?.includes("past_due_days") || error.message?.includes("reminder_interval_days") || error.code === "42703") {
      const { data: fallback, error: err2 } = await supabaseAdmin
        .from("businesses")
        .select(baseSelect)
        .eq("id", businessId)
        .single();
      if (err2 || !fallback) {
        return NextResponse.json({ error: err2?.message || "Business not found" }, { status: 404 });
      }
      return NextResponse.json({ business: { ...fallback, past_due_days: 0, reminder_interval_days: 0 } });
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
    const { logo_url, invoice_footer, support_email, past_due_days, reminder_interval_days } = body as {
      logo_url?: string;
      invoice_footer?: string;
      support_email?: string;
      past_due_days?: number | string;
      reminder_interval_days?: number | string;
    };

    const update: Record<string, unknown> = {};
    if (typeof logo_url === "string") update.logo_url = logo_url;
    if (typeof invoice_footer === "string") update.invoice_footer = invoice_footer;
    if (typeof support_email === "string") update.support_email = support_email;
    const pdd = typeof past_due_days === "number" ? past_due_days : parseInt(String(past_due_days ?? ""), 10);
    if (!isNaN(pdd) && pdd >= 0) update.past_due_days = Math.min(365, Math.round(pdd));
    const rid = typeof reminder_interval_days === "number" ? reminder_interval_days : parseInt(String(reminder_interval_days ?? ""), 10);
    if (!isNaN(rid) && rid >= 0) update.reminder_interval_days = Math.min(365, Math.round(rid));

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
    }

    const selectCols = "id, name, slug, subdomain, logo_url, support_email, invoice_footer, kind";
    const { data, error } = await supabaseAdmin
      .from("businesses")
      .update(update)
      .eq("id", businessId)
      .select(`${selectCols}, past_due_days, reminder_interval_days`)
      .single();

    if (error) {
      if (error.message?.includes("past_due_days") || error.message?.includes("reminder_interval_days") || error.code === "42703") {
        const updateFallback = { ...update };
        delete updateFallback.past_due_days;
        delete updateFallback.reminder_interval_days;
        if (Object.keys(updateFallback).length === 0) {
          return NextResponse.json({ error: "Settings could not be saved. Please try again later." }, { status: 500 });
        }
        const { data: d2, error: e2 } = await supabaseAdmin
          .from("businesses")
          .update(updateFallback)
          .eq("id", businessId)
          .select(selectCols)
          .single();
        if (e2 || !d2) return NextResponse.json({ error: e2?.message || "Failed to update" }, { status: 500 });
        return NextResponse.json({ business: { ...d2, past_due_days: !isNaN(pdd) ? Math.min(365, Math.max(0, Math.round(pdd))) : 0, reminder_interval_days: !isNaN(rid) ? Math.min(365, Math.max(0, Math.round(rid))) : 0 } });
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

