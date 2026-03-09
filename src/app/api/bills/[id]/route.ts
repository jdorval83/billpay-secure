import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await getBusinessIdForRequest(request);
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Bill ID required" }, { status: 400 });

  let { data: bill, error } = await supabaseAdmin
    .from("bills")
    .select("*, customers(name, email, phone)")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!bill) {
    const { data: byId } = await supabaseAdmin.from("bills").select("id, business_id").eq("id", id).maybeSingle();
    if (byId && (byId as { business_id: string }).business_id !== businessId) {
      return NextResponse.json({ error: "This bill belongs to a different account" }, { status: 403 });
    }
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  return NextResponse.json({ bill });
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  ready: ["billed"],
  draft: ["ready", "billed"],
  billed: ["paid", "past_due"],
  past_due: ["paid"],
  finalized: ["billed", "paid", "past_due"],
  sent: ["billed", "paid", "past_due"],
  paid: [],
};

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await getBusinessIdForRequest(_request);
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Bill ID required" }, { status: 400 });

  let body: { status?: string; writeoffReason?: string | null; amount_cents?: number; description?: string; due_date?: string };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  let { data: bill, error: fetchError } = await supabaseAdmin
    .from("bills")
    .select("id, status, business_id, first_sent_at")
    .eq("business_id", businessId)
    .eq("id", id)
    .maybeSingle();

  if (fetchError) return NextResponse.json({ error: fetchError.message }, { status: 500 });
  if (!bill) {
    const { data: byId } = await supabaseAdmin.from("bills").select("id, business_id").eq("id", id).maybeSingle();
    if (byId && (byId as { business_id: string }).business_id !== businessId) {
      return NextResponse.json({ error: "This bill belongs to a different account" }, { status: 403 });
    }
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const effectiveBusinessId = (bill as { business_id: string }).business_id;
  const update: Record<string, unknown> = {};

  // Field updates (amount, description, due_date) — only for draft/ready
  const canEdit = ["draft", "ready"].includes((bill.status || "").toLowerCase());
  if (canEdit) {
    if (typeof body.amount_cents === "number" && body.amount_cents > 0) {
      update.amount_cents = Math.round(body.amount_cents);
      update.balance_cents = Math.round(body.amount_cents);
    }
    if (typeof body.description === "string") update.description = body.description.trim() || "Invoice";
    if (typeof body.due_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) update.due_date = body.due_date;
  }

  // Status update
  const newStatus = body.status && String(body.status).toLowerCase();
  if (newStatus && ["ready", "billed", "paid", "past_due"].includes(newStatus)) {
    const current = (bill.status || "draft").toLowerCase();
    const allowed = ALLOWED_TRANSITIONS[current];
    if (!allowed?.includes(newStatus)) {
      return NextResponse.json({ error: `Cannot change status from ${current} to ${newStatus}` }, { status: 400 });
    }
    update.status = newStatus;
    const nowIso = new Date().toISOString();
    if (newStatus === "sent" || newStatus === "billed") {
      update.sent_at = nowIso;
      update.first_sent_at = bill.first_sent_at || nowIso;
      update.last_sent_at = nowIso;
    }
    if (newStatus === "paid") {
      update.paid_at = nowIso;
      update.balance_cents = 0;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No valid updates provided" }, { status: 400 });
  }

  const { data: updated, error } = await supabaseAdmin
    .from("bills")
    .update(update)
    .eq("business_id", effectiveBusinessId)
    .eq("id", id)
    .select("*, customers(name, email, phone)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bill: updated });
}
