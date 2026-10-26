const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));

const sanitizeEnv = (val) => {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
};

const url = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_URL || '');
const key = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

console.log("=== SUPABASE AUTH DIAGNOSTIC TEST ===");
console.log("Supabase URL configured:", Boolean(url));
console.log("Supabase Key configured:", Boolean(key));

const supabase = createClient(url, key);

async function runAuthDiagnostics() {
  // Test A: Test unknown user authentication behavior
  console.log("\n1. Testing Supabase Auth behavior on non-existent account...");
  const fakeEmail = `nonexistent_user_${Date.now()}@sahayata.demo`;
  const { data: failData, error: failError } = await supabase.auth.signInWithPassword({
    email: fakeEmail,
    password: "WrongPassword123!"
  });

  console.log("Expected rejection result:");
  console.log("- Data user:", failData?.user || null);
  console.log("- Error message from Supabase:", failError?.message);
  console.log("- Error status:", failError?.status);

  // Test B: Verify AuthProvider message mapping
  let mappedMsg = failError?.message;
  if (mappedMsg === "Invalid login credentials" || mappedMsg?.toLowerCase().includes("invalid login credentials")) {
    mappedMsg = "Incorrect email or password.";
  }
  console.log("- Mapped UI message:", mappedMsg);
  console.log("- User-facing safe mapping works:", mappedMsg === "Incorrect email or password.");

  // Test C: Test profile query permissions for role check
  console.log("\n2. Checking profiles table structure & role accessibility...");
  const { data: profiles, error: profErr } = await supabase
    .from("profiles")
    .select("id, role")
    .limit(3);

  if (profErr) {
    console.log("Profiles query (anon):", profErr.message);
  } else {
    console.log("Profiles query (anon) succeeded, sample count:", profiles.length);
  }
}

runAuthDiagnostics().catch(console.error);
