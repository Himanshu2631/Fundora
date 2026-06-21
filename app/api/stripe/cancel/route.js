import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase-server";
import { stripe, isStripeMock } from "@/lib/stripe";

export async function POST(req) {
  try {
    // 1. Authenticate user
    const supabase = await createServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Retrieve user subscription
    const { data: subscription, error: subError } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (subError || !subscription) {
      return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
    }

    // 3. Mock logic
    if (isStripeMock || !subscription.stripe_subscription_id) {
      console.log(`[Stripe Mock] Directly cancelling subscription in database for user: ${user.id}`);
      
      const { error: cancelError } = await supabase
        .from("subscriptions")
        .update({ status: "canceled" })
        .eq("user_id", user.id);

      if (cancelError) {
        throw cancelError;
      }

      return NextResponse.json({ success: true, message: "Mock subscription canceled successfully." });
    }

    // 4. Real Stripe cancellation (cancel at period end)
    console.log(`[Stripe] Setting subscription ${subscription.stripe_subscription_id} to cancel at period end`);
    await stripe.subscriptions.update(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    // Update database status to canceled
    const { error: dbError } = await supabase
      .from("subscriptions")
      .update({ status: "canceled" })
      .eq("user_id", user.id);

    if (dbError) {
      console.error("Failed to update database status after Stripe cancel:", dbError);
    }

    return NextResponse.json({ success: true, message: "Subscription set to cancel at period end." });
  } catch (error) {
    console.error("Error in Stripe Cancel Route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
