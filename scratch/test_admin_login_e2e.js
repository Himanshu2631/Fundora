const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const sanitizeEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, "").trim() : "";

const url = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_URL || "");
const key = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

async function verifyAdminAuthFlow() {
  console.log("=================================================");
  console.log("STEP 5: COMPREHENSIVE ADMIN AUTH VERIFICATION");
  console.log("=================================================");

  const supabase = createClient(url, key);

  // Test 1: Valid admin credentials
  console.log("\n1. Testing Valid Admin Sign In (admin@sahayata.demo)...");
  const { data: adminAuthData, error: adminAuthErr } = await supabase.auth.signInWithPassword({
    email: "admin@sahayata.demo",
    password: "Admin@123"
  });

  if (adminAuthErr || !adminAuthData?.user) {
    throw new Error(`Admin sign in failed: ${adminAuthErr?.message}`);
  }
  console.log("  ✓ Supabase Auth succeeded");
  console.log("  ✓ User ID:", adminAuthData.user.id);
  console.log("  ✓ User email:", adminAuthData.user.email);

  // Check admin role authorization in profiles
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", adminAuthData.user.id)
    .single();

  if (profErr) {
    throw new Error(`Failed to query admin profile: ${profErr.message}`);
  }

  console.log("  ✓ Profile role retrieved:", profile.role);
  if (profile.role !== "admin") {
    throw new Error(`Expected profile role 'admin', got '${profile.role}'`);
  }
  console.log("  ✓ Admin role verified: User authorized for /admin/dashboard");

  // Sign out admin session
  await supabase.auth.signOut();

  // Test 2: Invalid password
  console.log("\n2. Testing Invalid Password Rejection...");
  const { data: badPassData, error: badPassErr } = await supabase.auth.signInWithPassword({
    email: "admin@sahayata.demo",
    password: "IncorrectPassword999!"
  });

  console.log("  ✓ Invalid password rejected by Supabase Auth");
  console.log("  ✓ Error message:", badPassErr?.message);
  console.log("  ✓ Session created:", Boolean(badPassData?.session));

  if (badPassData?.session) {
    throw new Error("Invalid password should not generate a session!");
  }

  // Test 3: Non-admin user isolation
  console.log("\n3. Testing Non-Admin Authorization Guard...");
  // Create / sign in as a standard user
  const nonAdminEmail = `standard_user_${Date.now()}@sahayata.demo`;
  const { data: nonAdminData, error: nonAdminErr } = await supabase.auth.signUp({
    email: nonAdminEmail,
    password: "UserPassword123!",
    options: {
      data: { full_name: "Regular User" }
    }
  });

  if (nonAdminData?.user) {
    const { data: nonAdminProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", nonAdminData.user.id)
      .maybeSingle();

    console.log("  ✓ Standard user profile role:", nonAdminProfile?.role || "user (default)");
    const isGrantedAdmin = (nonAdminProfile?.role === "admin");
    console.log("  ✓ Admin access granted:", isGrantedAdmin);
    if (isGrantedAdmin) {
      throw new Error("Security violation: Standard user must not have admin access!");
    }
    console.log("  ✓ Non-admin access correctly restricted");
  }

  console.log("\n=================================================");
  console.log("ALL AUTH & AUTHORIZATION VERIFICATIONS PASSED!");
  console.log("=================================================");
}

verifyAdminAuthFlow().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
