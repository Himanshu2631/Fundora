const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error("Missing Supabase URL or Publishable key in environment.");
  process.exit(1);
}

const supabase = createClient(url, key);

// The test user ID from auth.users:
const testUserId = "c929b179-43a6-4825-a3e7-d3f6358dd986";

async function diagnose() {
  console.log("=== STARTING CHECKOUT FLOW DIAGNOSIS ===");
  console.log("Supabase URL:", url);
  console.log("Target User ID:", testUserId);

  // 1. Check if profile exists
  console.log("\n1. Checking profiles table for user ID...");
  const { data: profile, error: profileErr } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", testUserId)
    .maybeSingle();

  if (profileErr) {
    console.error("❌ Error querying profiles:", profileErr);
  } else if (!profile) {
    console.log("❌ Profile does NOT exist for user ID in profiles table!");
  } else {
    console.log("✅ Profile exists:", profile);
  }

  // 2. Simulate profile update (like route handler line 49)
  console.log("\n2. Attempting to update profiles stripe_customer_id...");
  const { data: updatedProfile, error: updateProfileErr } = await supabase
    .from("profiles")
    .update({ stripe_customer_id: "mock-cus-test" })
    .eq("id", testUserId)
    .select();

  if (updateProfileErr) {
    console.error("❌ Error updating profile:", updateProfileErr);
  } else {
    console.log("✅ Profile update succeeded (or no-op):", updatedProfile);
  }

  // 3. Simulate subscriptions insert (like syncStripeSubscriptionToDatabase)
  console.log("\n3. Attempting to insert subscription...");
  const subPayload = {
    user_id: testUserId,
    plan_type: "scout",
    plan_name: "scout",
    status: "active",
    renewal_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    stripe_subscription_id: "mock-sub-test",
    subscription_id: "mock-sub-test",
    stripe_price_id: "price_scout_monthly",
    customer_id: "mock-cus-test",
    card_brand: "Visa",
    card_last4: "4242",
  };

  const { data: insertedSub, error: insertSubErr } = await supabase
    .from("subscriptions")
    .insert(subPayload)
    .select();

  if (insertSubErr) {
    console.error("❌ Error inserting subscription (syncStripeSubscriptionToDatabase):", {
      code: insertSubErr.code,
      message: insertSubErr.message,
      details: insertSubErr.details,
      hint: insertSubErr.hint
    });
  } else {
    console.log("✅ Subscription insertion succeeded:", insertedSub);
  }

  // 4. Simulate payments insert (like route handler line 74)
  console.log("\n4. Attempting to insert payment record...");
  const { data: insertedPay, error: insertPayErr } = await supabase
    .from("payments")
    .insert({
      user_id: testUserId,
      amount: 10.00,
      status: "succeeded",
      stripe_invoice_id: "mock-in-test-" + Math.random().toString(36).substring(2, 8),
      invoice_pdf_url: "/mock-invoice",
      hosted_invoice_url: "/mock-invoice",
    })
    .select();

  if (insertPayErr) {
    console.error("❌ Error inserting payment record:", {
      code: insertPayErr.code,
      message: insertPayErr.message,
      details: insertPayErr.details,
      hint: insertPayErr.hint
    });
  } else {
    console.log("✅ Payment insertion succeeded:", insertedPay);
  }
}

diagnose().catch(console.error);
