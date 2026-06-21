import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase-server";
import { stripe, isStripeMock } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    // 1. Authenticate user
    const supabase = await createServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Retrieve user profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: "User profile not found" }, { status: 404 });
    }

    const stripeCustomerId = profile.stripe_customer_id;
    const requestUrl = new URL(req.url);
    const origin = requestUrl.origin;

    // 3. Mock logic
    if (isStripeMock || !stripeCustomerId) {
      console.log(`[Stripe Mock] Simulating redirection to Customer Billing Portal`);
      return NextResponse.json({ url: `/dashboard/subscription?mock_portal=true` });
    }

    // 4. Real Stripe Billing Portal Session
    const session = await stripe.billingPortal.sessions.create({
      customer: stripeCustomerId,
      return_url: `${origin}/dashboard/subscription`,
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Error in Stripe Customer Portal Route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
