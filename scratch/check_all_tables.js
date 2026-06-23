const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function main() {
  const tables = [
    "profiles",
    "subscriptions",
    "scores",
    "charities",
    "draws",
    "draw_entries",
    "winner_submissions",
    "payments"
  ];

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select("*");
    if (error) {
      console.log(`❌ Table "${table}": Error: ${error.message}`);
    } else {
      console.log(`✅ Table "${table}": ${data.length} rows`);
      if (data.length > 0) {
        console.log(data.slice(0, 2));
      }
    }
  }
}

main().catch(console.error);
