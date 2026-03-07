import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

const BUCKET = "check-images";
const MAX_SIZE_BYTES = 500 * 1024; // 500KB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);

  const { data: records, error } = await supabaseAdmin
    .from("payment_records")
    .select("id, amount_cents, check_number, payer_name, paid_at, notes, image_url, created_at")
    .eq("business_id", businessId)
    .order("paid_at", { ascending: false })
    .limit(100);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ paymentRecords: records || [] });
}

export async function POST(request: Request) {
  try {
    const businessId = await getBusinessIdForRequest(request);

    const formData = await request.formData();
    const amount = formData.get("amount_cents");
    const checkNumber = formData.get("check_number");
    const payerName = formData.get("payer_name");
    const paidAt = formData.get("paid_at");
    const notes = formData.get("notes");
    const billIdsRaw = formData.get("bill_ids"); // JSON array string
    const file = formData.get("file") as File | null;

    const amountCents = amount != null ? Math.round(Number(amount)) : null;
    if (amountCents == null || amountCents <= 0) {
      return NextResponse.json({ error: "Valid amount is required" }, { status: 400 });
    }

    const paidAtDate = paidAt && String(paidAt).trim() ? String(paidAt).trim() : new Date().toISOString().slice(0, 10);

    let imageUrl: string | null = null;
    if (file && file instanceof File) {
      if (file.size > MAX_SIZE_BYTES) {
        return NextResponse.json({ error: "Image too large (max 500KB)" }, { status: 400 });
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        return NextResponse.json({ error: "Only JPG, PNG, or WebP allowed" }, { status: 400 });
      }
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${businessId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const buffer = Buffer.from(await file.arrayBuffer());
      const { error: uploadError } = await supabaseAdmin.storage
        .from(BUCKET)
        .upload(path, buffer, { upsert: false, contentType: file.type });
      if (uploadError) {
        return NextResponse.json({ error: uploadError.message }, { status: 500 });
      }
      const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
      imageUrl = urlData.publicUrl;
    }

    const { data: record, error: insertError } = await supabaseAdmin
      .from("payment_records")
      .insert({
        business_id: businessId,
        amount_cents: amountCents,
        check_number: checkNumber ? String(checkNumber).trim().slice(0, 100) : null,
        payer_name: payerName ? String(payerName).trim().slice(0, 200) : null,
        paid_at: paidAtDate,
        notes: notes ? String(notes).trim().slice(0, 2000) : null,
        image_url: imageUrl,
      })
      .select("id, amount_cents, check_number, payer_name, paid_at, notes, image_url, created_at")
      .single();

    if (insertError || !record) {
      return NextResponse.json({ error: insertError?.message || "Failed to create payment record" }, { status: 500 });
    }

    let billIds: string[] = [];
    try {
      if (billIdsRaw && typeof billIdsRaw === "string") {
        const parsed = JSON.parse(billIdsRaw);
        billIds = Array.isArray(parsed) ? parsed.filter((x: unknown) => typeof x === "string") : [];
      }
    } catch {
      // ignore
    }

    const nowIso = new Date().toISOString();
    if (billIds.length > 0) {
      await supabaseAdmin.from("payment_record_bills").insert(
        billIds.map((billId: string) => ({
          payment_record_id: record.id,
          bill_id: billId,
        }))
      );
      await supabaseAdmin
        .from("bills")
        .update({ status: "paid", paid_at: nowIso, balance_cents: 0 })
        .eq("business_id", businessId)
        .in("id", billIds);
    }

    return NextResponse.json({ paymentRecord: record, billsMarkedPaid: billIds.length });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
