import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

export async function GET(request: Request) {
  const businessId = await getBusinessIdForRequest(request);
  const { data: current } = await supabaseAdmin
    .from("businesses")
    .select("id, kind")
    .eq("id", businessId)
    .single();

  if (!current || (current as { kind?: string }).kind !== "platform") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [
    { count: businessCount },
    { count: customerCount },
    { count: billCount },
    { count: invoiceCount },
  ] = await Promise.all([
    supabaseAdmin.from("businesses").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("customers").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("bills").select("id", { count: "exact", head: true }),
    supabaseAdmin.from("invoices").select("id", { count: "exact", head: true }),
  ]);

  return NextResponse.json({
    businesses: businessCount ?? 0,
    customers: customerCount ?? 0,
    bills: billCount ?? 0,
    invoices: invoiceCount ?? 0,
  });
}
