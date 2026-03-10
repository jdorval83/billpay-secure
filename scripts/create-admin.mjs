/**
 * One-time script to create admin user.
 * Run: node scripts/create-admin.mjs
 * Loads .env.local from project root.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Load .env.local
const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env.local");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const PLATFORM_BUSINESS_ID = "00000000-0000-0000-0000-000000000001";
const ADMIN_EMAIL = "support@billpaysecure.com";
const ADMIN_PASSWORD = "Spring2026!";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const admin = createClient(url, serviceKey);

const { data: listData } = await admin.auth.admin.listUsers();
const user = listData?.users?.find((u) => u.email === ADMIN_EMAIL);

if (user) {
  await admin.auth.admin.updateUserById(user.id, {
    password: ADMIN_PASSWORD,
    user_metadata: { business_subdomain: "test", business_id: PLATFORM_BUSINESS_ID },
  });
  console.log("Existing user updated. Password reset.");
} else {
  const { error } = await admin.auth.admin.createUser({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    email_confirm: true,
    user_metadata: { business_subdomain: "test", business_id: PLATFORM_BUSINESS_ID },
  });
  if (error) {
    console.error("Error:", error.message);
    process.exit(1);
  }
  console.log("Admin user created.");
}

console.log(`
Admin login:
  URL: https://test.billpaysecure.com
  Email: ${ADMIN_EMAIL}
  Password: ${ADMIN_PASSWORD}
`);
