const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const sanitizeEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, "").trim() : "";

const url = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_URL || "");
const key = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

const supabase = createClient(url, key);

async function setupAdminProfile() {
  console.log("=== CHECKING AND CONFIGURING ADMIN PROFILE ===");
  
  // Sign in as admin@sahayata.demo to obtain authenticated client session
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: "admin@sahayata.demo",
    password: "Admin@123"
  });

  if (signInError || !signInData?.user) {
    console.error("Sign in failed:", signInError);
    return;
  }

  const userId = signInData.user.id;
  console.log("Authenticated as user:", userId);

  // Check if profile exists
  const { data: existingProfile, error: fetchErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  console.log("Existing profile:", existingProfile, "Fetch error:", fetchErr);

  if (!existingProfile) {
    console.log("Creating admin profile...");
    const { data: newProfile, error: insertErr } = await supabase
      .from("profiles")
      .insert({
        id: userId,
        email: "admin@sahayata.demo",
        full_name: "Admin Reviewer",
        role: "admin"
      })
      .select()
      .single();

    if (insertErr) {
      console.error("Insert profile error:", insertErr);
    } else {
      console.log("✅ Admin profile created successfully:", newProfile);
    }
  } else {
    console.log("Updating profile role to admin...");
    const { data: updatedProfile, error: updateErr } = await supabase
      .from("profiles")
      .update({
        role: "admin",
        full_name: "Admin Reviewer"
      })
      .eq("id", userId)
      .select()
      .single();

    if (updateErr) {
      console.error("Update profile error:", updateErr);
    } else {
      console.log("✅ Admin profile updated successfully:", updatedProfile);
    }
  }

  // Double check profile query
  const { data: finalProfile, error: finalErr } = await supabase
    .from("profiles")
    .select("id, email, full_name, role")
    .eq("id", userId)
    .single();

  console.log("Final profile verification:", finalProfile);
}

setupAdminProfile().catch(console.error);
