import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

function slugifySubdomain(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Create a signup request instead of auto-creating. Admin approves from /admin */
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

    const { data: existingRequest } = await supabaseAdmin
      .from("signup_requests")
      .select("id")
      .eq("subdomain", slug)
      .eq("status", "pending")
      .maybeSingle();

    if (existingRequest) {
      return NextResponse.json({ error: `A request for subdomain "${slug}" is already pending` }, { status: 400 });
    }

    const { error: insertError } = await supabaseAdmin
      .from("signup_requests")
      .insert({
        business_name: businessName.trim(),
        subdomain: slug,
        email: email.trim(),
        password_temp: password,
        support_email: (supportEmail || email).trim() || null,
        status: "pending",
      });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      subdomain: slug,
      message: "Your request has been submitted. We'll review it and send you access when ready.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Signup failed" },
      { status: 500 }
    );
  }
}
