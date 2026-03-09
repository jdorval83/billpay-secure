import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const PRODUCTION_DOMAIN = "billpaysecure.com";

function slugifySubdomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      businessName,
      subdomain,
      email,
      password,
      supportEmail,
    } = body as {
      businessName?: string;
      subdomain?: string;
      email?: string;
      password?: string;
      supportEmail?: string;
    };

    if (!businessName || typeof businessName !== "string" || !businessName.trim()) {
      return NextResponse.json({ error: "Business name is required" }, { status: 400 });
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }
    if (!password || typeof password !== "string" || password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters" }, { status: 400 });
    }

    const rawSubdomain = (subdomain || businessName).trim();
    const slug = slugifySubdomain(rawSubdomain);
    if (!slug || slug.length < 2) {
      return NextResponse.json({ error: "Subdomain must be at least 2 characters (letters, numbers, hyphens)" }, { status: 400 });
    }

    const reserved = ["www", "api", "app", "test", "admin", "platform", "support", "mail"];
    if (reserved.includes(slug)) {
      return NextResponse.json({ error: `Subdomain "${slug}" is reserved` }, { status: 400 });
    }

    const { data: existing } = await supabaseAdmin
      .from("businesses")
      .select("id")
      .eq("subdomain", slug)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ error: `Subdomain "${slug}" is already taken` }, { status: 400 });
    }

    const slugForBusiness = slugifySubdomain(businessName) || slug;

    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .insert({
        name: businessName.trim(),
        slug: slugForBusiness,
        subdomain: slug,
        support_email: (supportEmail || email).trim(),
        kind: "tenant",
      })
      .select("id, name, subdomain")
      .single();

    if (bizError) {
      return NextResponse.json({ error: bizError.message }, { status: 500 });
    }

    const { error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { business_subdomain: slug, business_id: business.id },
    });

    if (authError) {
      return NextResponse.json({ error: authError.message }, { status: 400 });
    }

    const loginUrl = `https://${slug}.${PRODUCTION_DOMAIN}/dashboard`;

    return NextResponse.json({
      success: true,
      subdomain: slug,
      businessId: business.id,
      loginUrl,
      message: `Account created. Log in at ${loginUrl}`,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Signup failed" },
      { status: 500 }
    );
  }
}
