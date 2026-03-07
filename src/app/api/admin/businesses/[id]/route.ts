import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await getBusinessIdForRequest(request);
  const { id: targetId } = await params;

  const { data: current, error: currentError } = await supabaseAdmin
    .from("businesses")
    .select("id, kind")
    .eq("id", businessId)
    .single();

  if (currentError || !current || (current as { kind?: string }).kind !== "platform") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const {
    name,
    slug,
    subdomain,
    support_email,
    invoice_footer,
  } = body as {
    name?: string;
    slug?: string;
    subdomain?: string;
    support_email?: string;
    invoice_footer?: string;
  };

  const update: Record<string, unknown> = {};
  if (typeof name === "string" && name.trim()) update.name = name.trim();
  if (typeof slug === "string") update.slug = slug.trim() || null;
  if (typeof subdomain === "string") update.subdomain = subdomain.trim() || null;
  if (typeof support_email === "string") update.support_email = support_email.trim() || null;
  if (typeof invoice_footer === "string") update.invoice_footer = invoice_footer;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "No updatable fields provided" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("businesses")
    .update(update)
    .eq("id", targetId)
    .select("id, name, slug, subdomain, support_email, invoice_footer, logo_url, kind")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ business: data });
}
