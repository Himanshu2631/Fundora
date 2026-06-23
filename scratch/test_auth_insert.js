const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function testInsert() {
  console.log("=== STARTING AUTH AND SCORE INSERT TEST (NO PROFILE) ===");
  const testEmail = `testuser_${Date.now()}@example.com`;
  const testPassword = "Password123!";

  console.log(`Signing up new user: ${testEmail}...`);
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: {
        full_name: "Test RLS User"
      }
    }
  });

  if (signUpError) {
    console.error("❌ Sign up failed:", signUpError.message);
    return;
  }

  const user = signUpData.user;
  console.log("✅ Sign up succeeded. User ID:", user.id);

  // Set the session on the client manually
  if (signUpData.session) {
    await supabase.auth.setSession(signUpData.session);
  }

  // NOTE: We do NOT insert/verify the profile record here.
  // We want to see what error is returned when inserting a score for a user without a profile.

  // Attempting score insertion
  console.log("\nAttempting score insertion...");
  const scorePayload = {
    user_id: user.id,
    score: 36,
    score_date: new Date().toISOString().split("T")[0]
  };
  console.log("Payload:", scorePayload);

  const { data: insertedScore, error: scoreErr } = await supabase
    .from("scores")
    .insert(scorePayload)
    .select();

  if (scoreErr) {
    console.error("❌ Score insertion failed:", {
      code: scoreErr.code,
      message: scoreErr.message,
      details: scoreErr.details,
      hint: scoreErr.hint
    });
  } else {
    console.log("✅ Score insertion succeeded:", insertedScore);
  }
}

testInsert().catch(console.error);
