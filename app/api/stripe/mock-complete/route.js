import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase-server";
import { syncStripeSubscriptionToDatabase } from "@/services/subscriptionService";

export async function POST(req) {
  try {
    // 1. Authenticate user
    const supabase = await createServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request
    const body = await req.json().catch(() => ({}));
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 });
    }

    console.log(`[Stripe Mock webhook simulator] Simulating checkout.session.completed for user ${user.id}, plan price ${priceId}`);

    // 3. Determine billing cycle and calculate renewal date
    const renewalDate = new Date();
    if (priceId.includes("yearly")) {
      renewalDate.setFullYear(renewalDate.getFullYear() + 1);
    } else {
      renewalDate.setMonth(renewalDate.getMonth() + 1);
    }

    const stripeSubId = "mock-sub-" + Math.random().toString(36).substring(2, 15);
    const stripeCustomerId = "mock-cus-" + Math.random().toString(36).substring(2, 15);

    // Save mock customer ID to profile
    await supabase
      .from("profiles")
      .update({ stripe_customer_id: stripeCustomerId })
      .eq("id", user.id);

    // Reconcile database subscription
    await syncStripeSubscriptionToDatabase(
      user.id,
      stripeSubId,
      priceId,
      "active",
      renewalDate.toISOString(),
      supabase
    );

    // Log a simulated payment succeeded record
    let amount = 10.00;
    if (priceId.includes("scout")) amount = priceId.includes("yearly") ? 96.00 : 10.00;
    else if (priceId.includes("advocate")) amount = priceId.includes("yearly") ? 240.00 : 25.00;
    else if (priceId.includes("builder")) amount = priceId.includes("yearly") ? 960.00 : 100.00;

    await supabase.from("payments").insert({
      user_id: user.id,
      amount: amount,
      status: "succeeded",
      created_at: new Date().toISOString()
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error in mock-complete route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
