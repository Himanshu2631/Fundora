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

    // 2. Parse request parameters
    const body = await req.json().catch(() => ({}));
    const { priceId } = body;

    if (!priceId) {
      return NextResponse.json({ error: "priceId is required" }, { status: 400 });
    }

    const requestUrl = new URL(req.url);
    const origin = requestUrl.origin;

    // 3. Check if Stripe is in mock mode
    if (isStripeMock) {
      console.log(`[Stripe Mock] Redirecting to mock checkout for price: ${priceId}`);
      return NextResponse.json({ 
        url: `/dashboard/subscription/mock-checkout?price_id=${priceId}` 
      });
    }

    // 4. Retrieve or create Stripe customer
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id, email, full_name")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    let stripeCustomerId = profile.stripe_customer_id;

    if (!stripeCustomerId) {
      // Create a customer in Stripe
      const customer = await stripe.customers.create({
        email: profile.email,
        name: profile.full_name || user.email,
        metadata: {
          supabase_user_id: user.id
        }
      });
      stripeCustomerId = customer.id;

      // Update database profile
      const { error: updateError } = await supabase
        .from("profiles")
        .update({ stripe_customer_id: stripeCustomerId })
        .eq("id", user.id);

      if (updateError) {
        console.error("Failed to save stripe_customer_id to database profile:", updateError);
        // We can continue, but it might lead to duplicate customer creations later
      }
    }

    // 5. Create Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: "subscription",
      customer: stripeCustomerId,
      success_url: `${origin}/dashboard/subscription?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/pricing`,
      metadata: {
        supabase_user_id: user.id
      }
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error in Stripe Checkout API Route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
