import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);

  let pastDueDays = 0;
  try {
    const { data: biz } = await supabaseAdmin.from("businesses").select("past_due_days").eq("id", businessId).maybeSingle();
    const raw = (biz as { past_due_days?: number | string } | null)?.past_due_days;
    pastDueDays = Math.max(0, Math.min(365, parseInt(String(raw ?? 0), 10) || 0));
  } catch {
    // past_due_days column may not exist
  }

  const { data, error } = await supabaseAdmin
    .from("bills")
    .select("*, customers(name, email, phone)")
    .eq("business_id", businessId)
    .order("due_date", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const bills = (data || []) as { id: string; status: string; due_date: string; business_id: string }[];
  const today = new Date().toISOString().slice(0, 10);

  for (const b of bills) {
    const s = (b.status || "").toLowerCase();
    if (s === "billed" || s === "finalized" || s === "sent") {
      const [y, m, d] = (b.due_date || "").split("-").map((x) => parseInt(x, 10) || 0);
      if (y && m && d) {
        const cutoffDate = new Date(Date.UTC(y, m - 1, d + pastDueDays));
        const cutoff = cutoffDate.toISOString().slice(0, 10);
        if (today > cutoff) {
          await supabaseAdmin.from("bills").update({ status: "past_due" }).eq("id", b.id).eq("business_id", b.business_id);
          (b as { status: string }).status = "past_due";
        }
      }
    }
  }

  const billsList = data || [];
  const billIds = billsList.map((b: { id: string }) => b.id);
  const { data: links } = await supabaseAdmin
    .from("invoice_bills")
    .select("bill_id, invoice_id")
    .in("bill_id", billIds);
  const invoiceIds = Array.from(new Set((links || []).map((l: { invoice_id: string }) => l.invoice_id)));
  const { data: invoices } = invoiceIds.length > 0
    ? await supabaseAdmin
        .from("invoices")
        .select("id, public_token, status")
        .in("id", invoiceIds)
        .eq("business_id", businessId)
    : { data: [] };
  const invMap = new Map((invoices || []).map((i: { id: string; public_token?: string; status?: string }) => [i.id, i]));
  const pdfByBill = new Map<string, string>();
  for (const l of links || []) {
    const inv = invMap.get((l as { invoice_id: string }).invoice_id);
    if (inv?.public_token && !["paid", "void"].includes(inv.status || "")) {
      pdfByBill.set((l as { bill_id: string }).bill_id, inv.public_token);
    }
  }
  const billsWithPdf = billsList.map((b: { id: string }) => ({
    ...b,
    invoicePdfToken: pdfByBill.get(b.id) ?? null,
  }));

  return NextResponse.json({ bills: billsWithPdf });
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
        status: "ready",
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
  ready: ["billed"],
  draft: ["ready", "billed"],
  billed: ["paid", "past_due"],
  past_due: ["paid"],
  overdue: ["paid"],
  finalized: ["billed", "paid", "past_due"],
  sent: ["billed", "paid", "past_due"],
  paid: [],
};

export async function PATCH(request: Request) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const body = await request.json().catch(() => ({}));
    const ids: string[] = Array.isArray(body?.ids) ? body.ids : [];
    const newStatus = body?.status && String(body.status).toLowerCase();
    if (!ids.length || !newStatus || !["ready", "billed", "paid", "past_due"].includes(newStatus)) {
      return NextResponse.json(
        { error: "ids array and status (ready, billed, paid, written_off) required" },
        { status: 400 }
      );
    }

    let { data: bills, error: fetchErr } = await supabaseAdmin
      .from("bills")
      .select("id, status, first_sent_at, business_id")
      .eq("business_id", businessId)
      .in("id", ids);

    if ((fetchErr || !bills?.length) && ids.length > 0) {
      const { data: byIds } = await supabaseAdmin
        .from("bills")
        .select("id, status, first_sent_at, business_id")
        .in("id", ids);
      const matching = (byIds || []).filter((b: { business_id?: string }) => (b.business_id ?? "") === businessId);
      if (matching.length) bills = matching;
    }

    if (!bills?.length) {
      return NextResponse.json({ error: "Bills not found" }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const update: Record<string, unknown> = { status: newStatus };
    if (newStatus === "paid") {
      update.paid_at = nowIso;
      update.balance_cents = 0;
    }
    let updated = 0;
    for (const bill of bills as { id: string; status: string; first_sent_at?: string | null }[]) {
      const current = (bill.status || "draft").toLowerCase();
      const allowed = ALLOWED_TRANSITIONS[current];
      if (!allowed?.includes(newStatus)) continue;
      const u = { ...update } as Record<string, unknown>;
      if (newStatus === "sent" || newStatus === "billed") {
        (u as Record<string, unknown>).sent_at = nowIso;
        (u as Record<string, unknown>).last_sent_at = nowIso;
        (u as Record<string, unknown>).first_sent_at = bill.first_sent_at || nowIso;
      }
      const bid = (bill as { business_id?: string }).business_id ?? businessId;
      await supabaseAdmin.from("bills").update(u).eq("id", bill.id).eq("business_id", bid);
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
