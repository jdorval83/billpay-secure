import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { email, password, businessName } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 });
    }
    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: undefined },
    });
    if (authError) return NextResponse.json({ error: authError.message }, { status: 400 });
    if (!authData.user) return NextResponse.json({ error: "Sign up failed" }, { status: 400 });

    const name = (businessName && String(businessName).trim()) || "My Business";
    const { data: business, error: bizError } = await supabaseAdmin
      .from("businesses")
      .insert({ name })
      .select("id")
      .single();
    if (bizError) return NextResponse.json({ error: "Could not create business" }, { status: 500 });

    const { error: ubError } = await supabaseAdmin.from("user_businesses").insert({
      user_id: authData.user.id,
      business_id: business.id,
      role: "owner",
    });
    if (ubError) return NextResponse.json({ error: "Could not link account" }, { status: 500 });

    return NextResponse.json({ user: authData.user });
  } catch (err) {
    return NextResponse.json({ error: "Sign up failed" }, { status: 500 });
  }
}
