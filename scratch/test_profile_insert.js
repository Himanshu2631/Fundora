const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function testInsert() {
  console.log("=== STARTING PROFILE SELF-INSERT RLS TEST ===");
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = "Password123!";

  console.log(`Signing up new user: ${testEmail}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword
  });

  if (signUpError) {
    console.error("❌ Sign up failed:", signUpError.message);
    return;
  }

  const user = signUpData.user;
  console.log("✅ Sign up succeeded. User ID:", user.id);

  if (signUpData.session) {
    await supabase.auth.setSession(signUpData.session);
  }

  // 1. Delete the profile record that was automatically created by the trigger.
  // Note: We need admin privilege to delete a profile row for someone else,
  // but can this user delete their own profile record?
  // Let's check the update policy on profiles:
  // "Users can update their own profile" - it is FOR UPDATE.
  // "Admins have full access on profiles" - FOR ALL.
  // Wait! There is no DELETE policy on profiles for normal users.
  // But wait, the table definition has:
  // "id uuid references auth.users on delete cascade primary key"
  // So we cannot delete it client-side.
  // However, we can test insert by trying to insert a profile for a DIFFERENT user id, which should fail!
  // And if we want to test if they can insert their own, since the trigger already inserted it,
  // we can create a user, check that it exists, and then try to insert a DUPLICATE, which should fail with duplicate key,
  // not RLS violation!
  
  console.log("\nAttempting to insert a profile for a DIFFERENT user ID (should fail RLS)...");
  const randomUUID = "a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11";
  const { data: badProfile, error: badProfileErr } = await supabase
    .from("profiles")
    .insert({
      id: randomUUID,
      email: "baduser@example.com",
      full_name: "Bad User",
      role: "user"
    })
    .select();

  if (badProfileErr) {
    console.log("✅ Correctly rejected with error:", badProfileErr.message);
  } else {
    console.error("❌ Security vulnerability! Successfully inserted profile for another user ID:", badProfile);
  }

  console.log("\nAttempting to insert a profile for OUR user ID (should fail with duplicate key, NOT RLS)...");
  const { data: dupProfile, error: dupProfileErr } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      full_name: "Duplicate User",
      role: "user"
    })
    .select();

  if (dupProfileErr) {
    console.log("Result (expected duplicate key):", dupProfileErr.message);
    if (dupProfileErr.code === "23505") {
      console.log("✅ Succeeded! Returned duplicate key error 23505, meaning RLS check passed!");
    } else {
      console.error("❌ Failed with unexpected error code:", dupProfileErr.code, dupProfileErr.message);
    }
  } else {
    console.error("Duplicate insert succeeded without error (unexpected):", dupProfile);
  }
}

testInsert().catch(console.error);
