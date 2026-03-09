import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { data, error } = await supabaseAdmin
    .from("bills")
    .select("*, customers(name, email, phone)")
    .eq("business_id", businessId)
    .order("due_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ bills: data });
}

export async function POST(request: Request) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const body = await request.json();
    const { customer_id, amount_cents, description, due_date, recurring_schedule } = body;
    if (!customer_id || typeof customer_id !== "string") {
      return NextResponse.json({ error: "Customer is required" }, { status: 400 });
    }
    const amount = Math.round(Number(amount_cents) || 0);
    if (amount <= 0) return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 });
    const { data, error } = await supabaseAdmin
      .from("bills")
      .insert({
        business_id: businessId,
        customer_id: customer_id.trim(),
        amount_cents: amount,
        balance_cents: amount,
        description: (description && String(description).trim()) || "Invoice",
        due_date: due_date || new Date().toISOString().split("T")[0],
        status: "draft",
        recurring_schedule: ["weekly", "biweekly", "monthly"].includes(recurring_schedule) ? recurring_schedule : null,
      })
      .select("*, customers(name, email, phone)")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ bill: data });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  draft: ["finalized", "void"],
  finalized: ["draft", "sent", "void"],
  sent: ["paid", "written_off", "void"],
  billed: ["sent", "paid", "written_off", "void"],
  paid: [],
  written_off: [],
  void: [],
};

export async function PATCH(request: Request) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const newStatus = body?.status && String(body.status).toLowerCase();
    if (!ids.length || !newStatus || !["finalized", "sent", "paid", "written_off"].includes(newStatus)) {
      return NextResponse.json(
        { error: "ids array and status (finalized, sent, paid, written_off) required" },
        { status: 400 }
      );
    }

    const { data: bills, error: fetchErr } = await supabaseAdmin
      .from("bills")
      .select("id, status, first_sent_at")
      .eq("business_id", businessId)
      .in("id", ids);

    if (fetchErr || !bills?.length) {
      return NextResponse.json({ error: "Bills not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "paid") {
      update.paid_at = nowIso;
      update.balance_cents = 0;
    }
    if (newStatus === "written_off") {
      update.written_off_at = nowIso;
      update.balance_cents = 0;
      if (body.writeoffReason) update.writeoff_reason = String(body.writeoffReason).slice(0, 500);
    }

    let updated = 0;
    for (const bill of bills as { id: string; status: string; first_sent_at?: string | null }[]) {
      const current = (bill.status || "draft").toLowerCase();
      const allowed = ALLOWED_TRANSITIONS[current];
      if (!allowed?.includes(newStatus)) continue;
      const u = { ...update } as Record<string, unknown>;
      if (newStatus === "sent") {
        u.sent_at = nowIso;
        u.last_sent_at = nowIso;
        u.first_sent_at = bill.first_sent_at || nowIso;
      }
      await supabaseAdmin.from("bills").update(u).eq("id", bill.id).eq("business_id", businessId);
      updated++;
    }

    return NextResponse.json({ success: true, updated });
  } catch (err) {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    if (!ids.length) {
      return NextResponse.json({ error: "ids array is required" }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from("bills")
      .delete()
      .eq("business_id", businessId)
      .in("id", ids);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
