const { createClient } = require("@supabase/supabase-js");
const fs = require('fs');
const dotenv = require('dotenv');

const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const sanitizeEnv = (val) => val ? val.trim().replace(/^["']|["']$/g, "").trim() : "";

const url = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_URL || "");
const key = sanitizeEnv(envConfig.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY || "");

const supabase = createClient(url, key);

async function checkAccount() {
  console.log("=== CHECKING ADMIN ACCOUNT IN SUPABASE ===");
  
  // 1. Try signing in first
  console.log("1. Attempting signInWithPassword for admin@sahayata.demo...");
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email: "admin@sahayata.demo",
    password: "Admin@123"
  });

  if (signInData?.user) {
    console.log("✅ User already exists and signed in successfully!");
    console.log("User UUID:", signInData.user.id);
    console.log("Email confirmed at:", signInData.user.email_confirmed_at);
    
    // Check profile
    const { data: profile, error: profErr } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", signInData.user.id)
      .maybeSingle();
      
    console.log("Profile data:", profile);
    if (profErr) console.error("Profile fetch error:", profErr);
    return;
  }

  console.log("SignIn result: Not signed in. Error:", signInError?.message);

  // 2. Try signUp for admin@sahayata.demo
  console.log("\n2. Attempting signUp for admin@sahayata.demo...");
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: "admin@sahayata.demo",
    password: "Admin@123",
    options: {
      data: {
        full_name: "Admin Reviewer"
      }
    }
  });

  if (signUpError) {
    console.error("SignUp error:", signUpError.message, signUpError.status);
  } else {
    console.log("SignUp success!");
    console.log("User UUID:", signUpData.user?.id);
    console.log("User identities:", signUpData.user?.identities);
    console.log("Session present:", Boolean(signUpData.session));
    
    if (signUpData.user?.identities?.length === 0) {
      console.log("⚠️ Note: User identity is empty - user already exists in auth.users with unconfirmed email or different password!");
    }
  }
}

checkAccount().catch(console.error);
