import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

const TEST_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
const TEST_EMAIL = "joseph.o.dorval@gmail.com";
const TEST_PASSWORD = "BillPayTest2024!";

async function runSetup() {
  try {
    const { data: existing } = await supabaseAdmin.auth.admin.listUsers();
    const found = existing?.users?.find((u: { id?: string; email?: string }) => u.email === TEST_EMAIL);

    if (found) {
      await supabaseAdmin.auth.admin.updateUserById(found.id!, { password: TEST_PASSWORD });
      const { data: ub } = await supabaseAdmin.from("user_businesses").select("user_id").eq("user_id", found.id).single();
      if (!ub) {
        await supabaseAdmin.from("user_businesses").insert({
          user_id: found.id,
          business_id: TEST_BUSINESS_ID,
          role: "owner",
        });
      }
      return NextResponse.json({ message: "Password reset. Try logging in now.", email: TEST_EMAIL, password: TEST_PASSWORD });
    }

    const { data: user, error } = await supabaseAdmin.auth.admin.createUser({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      email_confirm: true,
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    if (!user.user) return NextResponse.json({ error: "Create failed" }, { status: 400 });

    await supabaseAdmin.from("user_businesses").insert({
      user_id: user.user.id,
      business_id: TEST_BUSINESS_ID,
      role: "owner",
    });

    return NextResponse.json({ message: "Test user created", email: TEST_EMAIL, password: TEST_PASSWORD });
  } catch (err) {
    console.error("[setup-test-user]", err);
    return NextResponse.json({ error: "Setup failed" }, { status: 500 });
  }
}

export async function POST() {
  return runSetup();
}
export async function GET() {
  return runSetup();
}
