const fs = require("fs");
const path = require("path");

const parentEnv = path.join(__dirname, "..", "..", ".env.local");
const mobileEnv = path.join(__dirname, "..", ".env");

if (!fs.existsSync(parentEnv)) {
  console.log("No .env.local in parent. Create mobile/.env manually. See README.");
  process.exit(0);
}

const content = fs.readFileSync(parentEnv, "utf8");
const lines = content.split("\n");
const out = [];
for (const line of lines) {
  let m = line.match(/^NEXT_PUBLIC_SUPABASE_URL=(.*)$/);
  if (m) {
    out.push(`EXPO_PUBLIC_SUPABASE_URL=${m[1].trim()}`);
    continue;
  }
  m = line.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)$/);
  if (m) {
    out.push(`EXPO_PUBLIC_SUPABASE_ANON_KEY=${m[1].trim()}`);
    continue;
  }
}
out.push("EXPO_PUBLIC_API_URL=https://billpaysecure.com");
fs.writeFileSync(mobileEnv, out.join("\n") + "\n");
console.log("Created mobile/.env from parent .env.local");
