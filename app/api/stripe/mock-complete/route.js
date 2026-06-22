import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase-server";
import { syncStripeSubscriptionToDatabase } from "@/services/subscriptionService";
import { sendSystemUpdateEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

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
    const { priceId, action, status } = body;
    const actionType = action || "checkout";

    console.log(`[Stripe Mock webhook simulator] Triggered ${actionType} action for user ${user.id}`);

    // Fetch existing subscription for contextual updates
    const { data: currentSub } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    if (actionType === "checkout") {
      if (!priceId) {
        return NextResponse.json({ error: "priceId is required for checkout action" }, { status: 400 });
      }

      // Determine billing cycle and calculate renewal date
      const renewalDate = new Date();
      if (priceId.includes("yearly")) {
        renewalDate.setFullYear(renewalDate.getFullYear() + 1);
      } else {
        renewalDate.setMonth(renewalDate.getMonth() + 1);
      }

      const stripeSubId = "mock-sub-" + Math.random().toString(36).substring(2, 15);
      const stripeCustomerId = currentSub?.stripe_customer_id || "mock-cus-" + Math.random().toString(36).substring(2, 15);

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
        supabase,
        "Visa",
        "4242",
        stripeCustomerId
      );

      // Log a simulated payment succeeded record
      let amount = 10.00;
      if (priceId.includes("scout")) amount = priceId.includes("yearly") ? 96.00 : 10.00;
      else if (priceId.includes("advocate")) amount = priceId.includes("yearly") ? 240.00 : 25.00;
      else if (priceId.includes("builder")) amount = priceId.includes("yearly") ? 960.00 : 100.00;

      const stripeInvoiceId = "mock-in-" + Math.random().toString(36).substring(2, 15);
      await supabase.from("payments").insert({
        user_id: user.id,
        amount: amount,
        status: "succeeded",
        stripe_invoice_id: stripeInvoiceId,
        invoice_pdf_url: `/dashboard/billing/invoice?payment_id=${stripeInvoiceId}`,
        hosted_invoice_url: `/dashboard/billing/invoice?payment_id=${stripeInvoiceId}`,
        created_at: new Date().toISOString()
      });

      // Send appropriate email notification
      const oldPlan = currentSub?.stripe_price_id;
      const hasActiveSub = currentSub && (currentSub.status === "active" || currentSub.status === "trialing");
      
      const newPlanName = priceId.includes("scout") 
        ? "Eco Scout" 
        : priceId.includes("advocate") 
          ? "Global Advocate" 
          : priceId.includes("builder") 
            ? "Legacy Builder" 
            : "Giving Plan";

      const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";
      const userName = user.user_metadata?.full_name || "Member";

      if (hasActiveSub && oldPlan && oldPlan !== priceId) {
        // Upgrade or Downgrade
        const planLevels = { scout: 1, advocate: 2, builder: 3 };
        const getPlanType = (pId) => {
          if (pId.includes("scout")) return "scout";
          if (pId.includes("advocate")) return "advocate";
          if (pId.includes("builder")) return "builder";
          return "scout";
        };
        const oldType = getPlanType(oldPlan);
        const newType = getPlanType(priceId);
        
        const isUpgrade = planLevels[newType] > planLevels[oldType];
        
        if (isUpgrade) {
          sendSystemUpdateEmail(user.email, {
            userName,
            updateTitle: "Membership Upgraded!",
            updateDetails: `Congratulations! Your membership was upgraded to <strong>${newPlanName}</strong> at ${timestamp}.<br/><br/>Your new entries multiplier has been applied, and your future contributions will be scaled to create larger environmental and educational impacts.`,
          }).catch(err => console.error("Error sending upgrade email:", err));
        } else {
          sendSystemUpdateEmail(user.email, {
            userName,
            updateTitle: "Membership Downgraded",
            updateDetails: `Your membership tier was adjusted to <strong>${newPlanName}</strong> at ${timestamp}.<br/><br/>Your contribution amounts and draw entries multiplier have been scaled to match this new tier.`,
          }).catch(err => console.error("Error sending downgrade email:", err));
        }
      } else {
        // New Purchase / Reactivation
        sendSystemUpdateEmail(user.email, {
          userName,
          updateTitle: "Subscription Activated",
          updateDetails: `Thank you for starting your active giving journey on Fundora!<br/><br/>Your membership plan <strong>${newPlanName}</strong> has been activated at ${timestamp}.<br/><br/>Your monthly contributions are now active. Head over to your dashboard to configure which vetted local charities receive your allocations.`,
        }).catch(err => console.error("Error sending purchase email:", err));
      }

      return NextResponse.json({ success: true, action: "checkout" });
    }

    if (actionType === "update_status") {
      if (!status) {
        return NextResponse.json({ error: "status is required for update_status action" }, { status: 400 });
      }

      if (!currentSub) {
        return NextResponse.json({ error: "No subscription to update. Please checkout first." }, { status: 400 });
      }

      // Check if status requires mapping or updates directly
      const validStatuses = ['active', 'canceled', 'past_due', 'incomplete', 'incomplete_expired', 'trialing', 'unpaid'];
      if (!validStatuses.includes(status)) {
        return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
      }

      await supabase
        .from("subscriptions")
        .update({ status })
        .eq("user_id", user.id);

      console.log(`[Stripe Mock webhook simulator] Updated subscription status to ${status} for user ${user.id}`);
      return NextResponse.json({ success: true, action: "update_status", status });
    }

    if (actionType === "payment_succeeded") {
      if (!currentSub) {
        return NextResponse.json({ error: "No active subscription to pay. Please checkout first." }, { status: 400 });
      }

      const priceId = currentSub.stripe_price_id || "price_scout_monthly";
      let amount = 10.00;
      if (priceId.includes("scout")) amount = priceId.includes("yearly") ? 96.00 : 10.00;
      else if (priceId.includes("advocate")) amount = priceId.includes("yearly") ? 240.00 : 25.00;
      else if (priceId.includes("builder")) amount = priceId.includes("yearly") ? 960.00 : 100.00;

      // Extend renewal date
      const currentRenewal = new Date(currentSub.renewal_date);
      const newRenewal = new Date(currentRenewal > new Date() ? currentRenewal : new Date());
      if (priceId.includes("yearly")) {
        newRenewal.setFullYear(newRenewal.getFullYear() + 1);
      } else {
        newRenewal.setMonth(newRenewal.getMonth() + 1);
      }

      const stripeInvoiceId = "mock-in-" + Math.random().toString(36).substring(2, 15);
      await supabase.from("payments").insert({
        user_id: user.id,
        amount: amount,
        status: "succeeded",
        stripe_invoice_id: stripeInvoiceId,
        invoice_pdf_url: `/dashboard/billing/invoice?payment_id=${stripeInvoiceId}`,
        hosted_invoice_url: `/dashboard/billing/invoice?payment_id=${stripeInvoiceId}`,
        created_at: new Date().toISOString()
      });

      await supabase
        .from("subscriptions")
        .update({ 
          status: "active",
          renewal_date: newRenewal.toISOString() 
        })
        .eq("user_id", user.id);

      console.log(`[Stripe Mock webhook simulator] Processed successful renewal payment for user ${user.id}. Renewal extended to ${newRenewal.toISOString()}`);
      
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";
      const userName = user.user_metadata?.full_name || "Member";
      sendSystemUpdateEmail(user.email, {
        userName,
        updateTitle: "Subscription Renewed",
        updateDetails: `Your Fundora subscription was successfully renewed at ${timestamp}.<br/><br/>Amount charged: <strong>$${amount.toFixed(2)}</strong>.<br/>Thank you for your continued support in backing verified environmental and education initiatives.`,
      }).catch(err => console.error("Error sending renewal email:", err));

      return NextResponse.json({ success: true, action: "payment_succeeded" });
    }

    if (actionType === "payment_failed") {
      if (!currentSub) {
        return NextResponse.json({ error: "No active subscription to log failure. Please checkout first." }, { status: 400 });
      }

      const priceId = currentSub.stripe_price_id || "price_scout_monthly";
      let amount = 10.00;
      if (priceId.includes("scout")) amount = priceId.includes("yearly") ? 96.00 : 10.00;
      else if (priceId.includes("advocate")) amount = priceId.includes("yearly") ? 240.00 : 25.00;
      else if (priceId.includes("builder")) amount = priceId.includes("yearly") ? 960.00 : 100.00;

      const stripeInvoiceId = "mock-in-" + Math.random().toString(36).substring(2, 15);
      await supabase.from("payments").insert({
        user_id: user.id,
        amount: amount,
        status: "failed",
        stripe_invoice_id: stripeInvoiceId,
        invoice_pdf_url: `/dashboard/billing/invoice?payment_id=${stripeInvoiceId}`,
        hosted_invoice_url: `/dashboard/billing/invoice?payment_id=${stripeInvoiceId}`,
        created_at: new Date().toISOString()
      });

      await supabase
        .from("subscriptions")
        .update({ status: "past_due" })
        .eq("user_id", user.id);

      console.log(`[Stripe Mock webhook simulator] Processed failed payment for user ${user.id}. Status set to past_due.`);
      return NextResponse.json({ success: true, action: "payment_failed" });
    }

    if (actionType === "delete") {
      if (!currentSub) {
        return NextResponse.json({ error: "No active subscription to delete." }, { status: 400 });
      }

      // Simulate deletion by setting status to canceled and renewal date to in the past (expired)
      const endedAt = new Date(Date.now() - 5000).toISOString(); // 5 seconds ago
      await supabase
        .from("subscriptions")
        .update({ 
          status: "canceled",
          renewal_date: endedAt
        })
        .eq("user_id", user.id);

      console.log(`[Stripe Mock webhook simulator] Processed immediate subscription deletion for user ${user.id}.`);
      
      const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";
      const userName = user.user_metadata?.full_name || "Member";
      sendSystemUpdateEmail(user.email, {
        userName,
        updateTitle: "Subscription Cancelled",
        updateDetails: `Your subscription has been cancelled at ${timestamp}.<br/><br/>You will retain access to your membership benefits and active entries until the end of your billing cycle. We are sad to see you go, but your contributions so far have created a verified impact!`,
      }).catch(err => console.error("Error sending cancellation email:", err));

      return NextResponse.json({ success: true, action: "delete" });
    }

    if (actionType === "reactivate") {
      if (!currentSub) {
        return NextResponse.json({ error: "No active subscription to reactivate." }, { status: 400 });
      }

      await supabase
        .from("subscriptions")
        .update({ status: "active" })
        .eq("user_id", user.id);

      console.log(`[Stripe Mock webhook simulator] Processed reactivate request for user ${user.id}.`);
      return NextResponse.json({ success: true, action: "reactivate" });
    }

    return NextResponse.json({ error: "Unhandled action type" }, { status: 400 });
  } catch (error) {
    console.error("Error in mock-complete route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
