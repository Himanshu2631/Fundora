const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

function getEnv() {
  const envPath = path.join(__dirname, "..", ".env.local");
  if (!fs.existsSync(envPath)) {
    console.error("No .env.local found");
    process.exit(1);
  }
  const content = fs.readFileSync(envPath, "utf-8");
  const env = {};
  content.split("\n").forEach(line => {
    const parts = line.split("=");
    if (parts.length >= 2) {
      env[parts[0].trim()] = parts.slice(1).join("=").trim();
    }
  });
  return env;
}

async function main() {
  const env = getEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    console.error("Missing URL or publishable key in env");
    process.exit(1);
  }

  console.log("Connecting to:", url);
  const supabase = createClient(url, key);

  console.log("\n--- Checking Profiles Table ---");
  const { data: profiles, error: pError } = await supabase.from("profiles").select("*");
  if (pError) {
    console.error("Error reading profiles:", pError);
  } else {
    console.log(`Found ${profiles.length} profiles:`);
    profiles.forEach(p => {
      console.log(`- ID: ${p.id} | Email: ${p.email} | Name: ${p.full_name} | Role: ${p.role}`);
    });
  }

  console.log("\n--- Checking Scores Table ---");
  const { data: scores, error: sError } = await supabase.from("scores").select("*");
  if (sError) {
    console.error("Error reading scores:", sError);
  } else {
    console.log(`Found ${scores.length} scores:`);
    scores.forEach(s => {
      console.log(`- ID: ${s.id} | User ID: ${s.user_id} | Score: ${s.score} | Date: ${s.score_date}`);
    });
  }
}

main().catch(console.error);
