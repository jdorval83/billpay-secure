import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getBusinessIdForRequest } from "@/lib/tenant";

const PRODUCTION_DOMAIN = "billpaysecure.com";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const businessId = await getBusinessIdForRequest(request);
  const { data: current } = await supabaseAdmin
    .from("businesses")
    .select("id, kind")
    .eq("id", businessId)
    .single();

  if (!current || (current as { kind?: string }).kind !== "platform") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const { data: reqRow, error: fetchErr } = await supabaseAdmin
    .from("signup_requests")
    .select("id, business_name, subdomain, email, password_temp, support_email")
    .eq("id", id)
    .eq("status", "pending")
    .single();

  if (fetchErr || !reqRow) {
    return NextResponse.json({ error: "Signup request not found or already processed" }, { status: 404 });
  }

  const slug = reqRow.subdomain;
  const { data: existingBiz } = await supabaseAdmin
    .from("businesses")
    .select("id")
    .eq("subdomain", slug)
    .maybeSingle();

  if (existingBiz) {
    return NextResponse.json({ error: `Subdomain "${slug}" is already taken` }, { status: 400 });
  }

  const { data: business, error: bizError } = await supabaseAdmin
    .from("businesses")
    .insert({
      name: reqRow.business_name,
      slug: slug,
      subdomain: slug,
      support_email: reqRow.support_email || reqRow.email,
      kind: "tenant",
    })
    .select("id, name, subdomain")
    .single();

  if (bizError) {
    return NextResponse.json({ error: bizError.message }, { status: 500 });
  }

  const { error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: reqRow.email,
    password: reqRow.password_temp,
    email_confirm: true,
    user_metadata: { business_subdomain: slug, business_id: business.id },
  });

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 });
  }

  await supabaseAdmin
    .from("signup_requests")
    .delete()
    .eq("id", id);

  const loginUrl = `https://${slug}.${PRODUCTION_DOMAIN}/`;

  return NextResponse.json({
    success: true,
    subdomain: slug,
    loginUrl,
    message: `Account created. User can log in at ${loginUrl}`,
  });
}
