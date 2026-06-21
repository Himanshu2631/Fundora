import { NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { createServer } from "@/lib/supabase-server";
import { syncStripeSubscriptionToDatabase } from "@/services/subscriptionService";

// Next.js Route Handler configuration to disable body parsing, as Stripe webhooks require the raw body.
export const dynamic = "force-dynamic";

export async function POST(req) {
  if (!stripe) {
    console.warn("[Stripe Webhook] Received webhook POST, but Stripe is in mock mode.");
    return NextResponse.json({ error: "Stripe is in mock mode" }, { status: 400 });
  }

  const sig = req.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: "Missing Stripe signature or webhook secret" }, { status: 400 });
  }

  let event;

  try {
    const bodyText = await req.text();
    event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);
  } catch (err) {
    console.error(`⚠️ Webhook signature verification failed:`, err.message);
    return NextResponse.json({ error: `Webhook Error: ${err.message}` }, { status: 400 });
  }

  console.log(`[Stripe Webhook] Received event: ${event.type}`);

  // Create a service-role or admin level supabase client (via createServer, which maps to server client)
  // Since we are writing to public tables from system webhooks, createServer is perfect.
  const supabase = await createServer();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object;
        const stripeCustomerId = session.customer;
        const stripeSubscriptionId = session.subscription;
        
        let userId = session.metadata?.supabase_user_id;

        // If metadata doesn't have it, lookup by customer ID
        if (!userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", stripeCustomerId)
            .maybeSingle();
          userId = profile?.id;
        }

        if (!userId) {
          console.error(`[Stripe Webhook] Supabase user ID not found for customer ${stripeCustomerId}`);
          break;
        }

        // Fetch Stripe Subscription to get details
        const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
        const priceId = sub.items.data[0].price.id;
        let status = sub.status;
        if (sub.cancel_at_period_end) {
          status = "canceled";
        }
        const renewalDate = new Date(sub.current_period_end * 1000).toISOString();

        // Retrieve card details from subscription if available
        let cardBrand = null;
        let cardLast4 = null;
        const defaultPaymentMethodId = sub.default_payment_method;
        if (defaultPaymentMethodId) {
          try {
            const pm = await stripe.paymentMethods.retrieve(
              typeof defaultPaymentMethodId === "string" ? defaultPaymentMethodId : defaultPaymentMethodId.id
            );
            if (pm.card) {
              cardBrand = pm.card.brand;
              cardLast4 = pm.card.last4;
            }
          } catch (e) {
            console.error("[Stripe Webhook] Error retrieving payment method from Stripe:", e.message);
          }
        }

        // Fetch user email from profile for logging
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .maybeSingle();
        const userEmail = profile?.email || session.customer_details?.email || "Unknown Email";

        console.log(`[Stripe Webhook LOG] Event: checkout.session.completed`);
        console.log(`- Stripe Customer ID: ${stripeCustomerId}`);
        console.log(`- Stripe Subscription ID: ${stripeSubscriptionId}`);
        console.log(`- User Email: ${userEmail}`);
        console.log(`- Plan Purchased: ${priceId}`);
        console.log(`- Webhook Status: ${status}`);

        // 1. Save stripe_customer_id on user profile for future lookups
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", userId);

        // 2. Sync subscription details to database
        await syncStripeSubscriptionToDatabase(userId, stripeSubscriptionId, priceId, status, renewalDate, supabase, cardBrand, cardLast4, stripeCustomerId);
        console.log(`[Stripe Webhook] Handled checkout.session.completed successfully for user ${userId}`);
        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object;
        const stripeCustomerId = sub.customer;
        const stripeSubscriptionId = sub.id;
        const priceId = sub.items.data[0].price.id;
        let status = sub.status;
        if (sub.cancel_at_period_end) {
          status = "canceled";
        }
        const renewalDate = new Date(sub.current_period_end * 1000).toISOString();

        let userId = sub.metadata?.supabase_user_id;

        if (!userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", stripeCustomerId)
            .maybeSingle();
          userId = profile?.id;
        }

        if (!userId) {
          console.error(`[Stripe Webhook] Supabase user ID not found for customer ${stripeCustomerId}`);
          break;
        }

        // Retrieve card details from subscription if available
        let cardBrand = null;
        let cardLast4 = null;
        const defaultPaymentMethodId = sub.default_payment_method;
        if (defaultPaymentMethodId) {
          try {
            const pm = await stripe.paymentMethods.retrieve(
              typeof defaultPaymentMethodId === "string" ? defaultPaymentMethodId : defaultPaymentMethodId.id
            );
            if (pm.card) {
              cardBrand = pm.card.brand;
              cardLast4 = pm.card.last4;
            }
          } catch (e) {
            console.error("[Stripe Webhook] Error retrieving payment method from Stripe:", e.message);
          }
        }

        // Fetch user email from profile for logging
        const { data: profile } = await supabase
          .from("profiles")
          .select("email")
          .eq("id", userId)
          .maybeSingle();
        const userEmail = profile?.email || "Unknown Email";

        console.log(`[Stripe Webhook LOG] Event: ${event.type}`);
        console.log(`- Stripe Customer ID: ${stripeCustomerId}`);
        console.log(`- Stripe Subscription ID: ${stripeSubscriptionId}`);
        console.log(`- User Email: ${userEmail}`);
        console.log(`- Plan Purchased: ${priceId}`);
        console.log(`- Webhook Status: ${status}`);

        // Save stripe_customer_id on user profile if not set yet
        await supabase
          .from("profiles")
          .update({ stripe_customer_id: stripeCustomerId })
          .eq("id", userId);

        await syncStripeSubscriptionToDatabase(userId, stripeSubscriptionId, priceId, status, renewalDate, supabase, cardBrand, cardLast4, stripeCustomerId);
        console.log(`[Stripe Webhook] Handled customer.subscription.updated successfully for user ${userId}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const stripeSubscriptionId = sub.id;

        // Find user by subscription ID
        const { data: dbSub } = await supabase
          .from("subscriptions")
          .select("user_id")
          .eq("stripe_subscription_id", stripeSubscriptionId)
          .maybeSingle();

        if (dbSub) {
          // If deleted in Stripe, set status to canceled and set renewal date to end time (past/current)
          const endedAt = sub.ended_at ? new Date(sub.ended_at * 1000).toISOString() : new Date().toISOString();
          await supabase
            .from("subscriptions")
            .update({ 
              status: "canceled",
              renewal_date: endedAt
            })
            .eq("user_id", dbSub.user_id);
          console.log(`[Stripe Webhook] Handled customer.subscription.deleted, marked canceled & ended at ${endedAt} for user ${dbSub.user_id}`);
        } else {
          console.warn(`[Stripe Webhook] Deleted Stripe subscription ${stripeSubscriptionId} not found in database`);
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const stripeCustomerId = invoice.customer;
        const stripeSubscriptionId = invoice.subscription;
        const stripeInvoiceId = invoice.id;
        
        let userId = invoice.subscription_details?.metadata?.supabase_user_id;

        if (!userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", stripeCustomerId)
            .maybeSingle();
          userId = profile?.id;
        }

        if (userId) {
          // Idempotency check
          if (stripeInvoiceId) {
            const { data: existingPayment } = await supabase
              .from("payments")
              .select("id")
              .eq("stripe_invoice_id", stripeInvoiceId)
              .maybeSingle();

            if (existingPayment) {
              console.log(`[Stripe Webhook] Duplicate payment event skipped for invoice: ${stripeInvoiceId}`);
              break;
            }
          }

          const amount = invoice.amount_paid / 100;
          
          await supabase.from("payments").insert({
            user_id: userId,
            amount: amount,
            status: "succeeded",
            stripe_invoice_id: stripeInvoiceId,
            invoice_pdf_url: invoice.invoice_pdf || null,
            hosted_invoice_url: invoice.hosted_invoice_url || null,
            created_at: new Date().toISOString()
          });

          // Retrieve extra details for logging
          const { data: profile } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", userId)
            .maybeSingle();
          const userEmail = profile?.email || invoice.customer_email || "Unknown Email";
          const priceId = invoice.lines?.data?.[0]?.price?.id || "Unknown Price";
          
          let subStatus = "active";
          let renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
          let cardBrand = null;
          let cardLast4 = null;

          // Sync subscription details if subscription ID is present
          if (stripeSubscriptionId) {
            try {
              const sub = await stripe.subscriptions.retrieve(stripeSubscriptionId);
              subStatus = sub.status;
              if (sub.cancel_at_period_end) {
                subStatus = "canceled";
              }
              renewalDate = new Date(sub.current_period_end * 1000).toISOString();

              const defaultPaymentMethodId = sub.default_payment_method;
              if (defaultPaymentMethodId) {
                try {
                  const pm = await stripe.paymentMethods.retrieve(
                    typeof defaultPaymentMethodId === "string" ? defaultPaymentMethodId : defaultPaymentMethodId.id
                  );
                  if (pm.card) {
                    cardBrand = pm.card.brand;
                    cardLast4 = pm.card.last4;
                  }
                } catch (e) {
                  console.error("[Stripe Webhook] Error retrieving payment method from Stripe:", e.message);
                }
              }

              // Reconcile and create/update subscription in DB using the main service function
              await syncStripeSubscriptionToDatabase(
                userId,
                stripeSubscriptionId,
                priceId,
                subStatus,
                renewalDate,
                supabase,
                cardBrand,
                cardLast4,
                stripeCustomerId
              );
            } catch (err) {
              console.error("[Stripe Webhook] Failed to retrieve subscription or sync database in invoice.payment_succeeded:", err.message);
            }
          }

          console.log(`[Stripe Webhook LOG] Event: invoice.payment_succeeded`);
          console.log(`- Stripe Customer ID: ${stripeCustomerId}`);
          console.log(`- Stripe Subscription ID: ${stripeSubscriptionId || "None"}`);
          console.log(`- User Email: ${userEmail}`);
          console.log(`- Plan Purchased: ${priceId}`);
          console.log(`- Webhook Status: ${subStatus}`);

          console.log(`[Stripe Webhook] Logged successful payment of $${amount} for user ${userId}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const stripeCustomerId = invoice.customer;
        const stripeInvoiceId = invoice.id;
        
        let userId = invoice.subscription_details?.metadata?.supabase_user_id;

        if (!userId) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("stripe_customer_id", stripeCustomerId)
            .maybeSingle();
          userId = profile?.id;
        }

        if (userId) {
          // Idempotency check
          if (stripeInvoiceId) {
            const { data: existingPayment } = await supabase
              .from("payments")
              .select("id")
              .eq("stripe_invoice_id", stripeInvoiceId)
              .maybeSingle();

            if (existingPayment) {
              console.log(`[Stripe Webhook] Duplicate payment failure event skipped for invoice: ${stripeInvoiceId}`);
              break;
            }
          }

          const amount = invoice.amount_due / 100;
          await supabase.from("payments").insert({
            user_id: userId,
            amount: amount,
            status: "failed",
            stripe_invoice_id: stripeInvoiceId,
            invoice_pdf_url: invoice.invoice_pdf || null,
            hosted_invoice_url: invoice.hosted_invoice_url || null,
            created_at: new Date().toISOString()
          });
          
          // Set subscription to past_due in database
          await supabase
            .from("subscriptions")
            .update({ status: "past_due" })
            .eq("user_id", userId);

          console.log(`[Stripe Webhook] Logged failed payment of $${amount} for user ${userId}`);
        }
        break;
      }

      default:
        console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Error handling Stripe Webhook event:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
