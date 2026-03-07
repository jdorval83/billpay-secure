import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

const BUCKET = "bill-attachments";
const MAX_SIZE_BYTES = 500 * 1024; // 500KB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const businessId = await getBusinessIdForRequest(request);
    const { id: billId } = await params;
    if (!billId) {
      return NextResponse.json({ error: "Bill ID required" }, { status: 400 });
    }

    const { data: bill, error: fetchError } = await supabaseAdmin
      .from("bills")
      .select("id")
      .eq("business_id", businessId)
      .eq("id", billId)
      .single();

    if (fetchError || !bill) {
      return NextResponse.json({ error: "Bill not found" }, { status: 404 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "Image too large (max 500KB)" }, { status: 400 });
    }
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Only JPG, PNG, or WebP allowed" }, { status: 400 });
    }

    const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
    const path = `${businessId}/${billId}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(path, buffer, { upsert: true, contentType: file.type });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: urlData } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
    const attachmentUrl = urlData.publicUrl;

    const { data: updated, error: updateError } = await supabaseAdmin
      .from("bills")
      .update({ attachment_url: attachmentUrl })
      .eq("business_id", businessId)
      .eq("id", billId)
      .select("*, customers(name, email, phone)")
      .single();

    if (updateError || !updated) {
      return NextResponse.json({ error: updateError?.message || "Failed to update bill" }, { status: 500 });
    }

    return NextResponse.json({ bill: updated });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Server error" },
      { status: 500 }
    );
  }
}
