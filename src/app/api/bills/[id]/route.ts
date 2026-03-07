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

  const { data: bill, error } = await supabaseAdmin
    .from("bills")
    .select("*, customers(name, email, phone)")
    .eq("business_id", businessId)
    .eq("id", id)
    .single();

  if (error || !bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  return NextResponse.json({ bill });
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["finalized", "void"],
  finalized: ["draft", "sent", "void"],
  sent: ["paid", "written_off", "void"],
  billed: ["void"],
  paid: [],
  written_off: [],
  void: [],
};

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await getBusinessIdForRequest(_request);
  const { id } = await params;
  if (!id) return NextResponse.json({ error: "Bill ID required" }, { status: 400 });

  let body: { status?: string; writeoffReason?: string | null };
  try {
    body = await _request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const newStatus = body.status && String(body.status).toLowerCase();
  if (
    !newStatus ||
    !["finalized", "draft", "void", "sent", "paid", "written_off"].includes(newStatus)
  ) {
    return NextResponse.json(
      { error: "status must be one of: finalized, draft, void, sent, paid, written_off" },
      { status: 400 }
    );
  }

  const { data: bill, error: fetchError } = await supabaseAdmin
    .from("bills")
    .select("id, status, business_id, first_sent_at")
    .eq("business_id", businessId)
    .eq("id", id)
    .single();

  if (fetchError || !bill) {
    return NextResponse.json({ error: "Bill not found" }, { status: 404 });
  }

  const current = (bill.status || "draft").toLowerCase();
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed || !allowed.includes(newStatus)) {
    return NextResponse.json(
      { error: `Cannot change status from ${current} to ${newStatus}` },
      { status: 400 }
    );
  }

  const update: Record<string, unknown> = { status: newStatus };
  const nowIso = new Date().toISOString();

  if (newStatus === "sent") {
    update.sent_at = nowIso;
    update.first_sent_at = bill.first_sent_at || nowIso;
    update.last_sent_at = nowIso;
  }
  if (newStatus === "paid") {
    update.paid_at = nowIso;
    update.balance_cents = 0;
  }
  if (newStatus === "written_off") {
    update.written_off_at = nowIso;
    update.balance_cents = 0;
    if (body.writeoffReason) {
      update.writeoff_reason = String(body.writeoffReason).slice(0, 500);
    }
  }

  const { data: updated, error } = await supabaseAdmin
    .from("bills")
    .update(update)
    .eq("business_id", businessId)
    .eq("id", id)
    .select("*, customers(name, email, phone)")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bill: updated });
}
