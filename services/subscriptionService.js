import { createClient } from "@/lib/supabase";

/**
 * Fetch the current active subscription for a user.
 * @param {string} userId - User ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function getSubscription(userId, supabaseClient) {
  if (!userId) return null;
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Error in getSubscription:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return null;
  }
  return data;
}

/**
 * Create a new active subscription for a user.
 * @param {string} userId - User ID.
 * @param {string} planType - 'scout', 'advocate', or 'builder'.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function createSubscription(userId, planType, supabaseClient) {
  const supabase = supabaseClient || createClient();

  // Calculate renewal date: 1 month from now
  const renewalDate = new Date();
  renewalDate.setMonth(renewalDate.getMonth() + 1);

  // Check if a subscription row already exists (e.g., re-activation of cancelled plan)
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (existing) {
    // Update existing row to active rather than inserting a duplicate
    const { data, error } = await supabase
      .from("subscriptions")
      .update({
        plan_type: planType,
        status: "active",
        renewal_date: renewalDate.toISOString(),
      })
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error in createSubscription (update):", error);
      throw error;
    }
    return data;
  }

  // No existing subscription — create a fresh row
  const { data, error } = await supabase
    .from("subscriptions")
    .insert({
      user_id: userId,
      plan_type: planType,
      status: "active",
      renewal_date: renewalDate.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error in createSubscription (insert):", error);
    throw error;
  }
  return data;
}

/**
 * Cancel an active subscription.
 * @param {string} userId - The user's ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function cancelSubscription(userId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error in cancelSubscription:", error);
    throw error;
  }
  return data;
}

/**
 * Update an existing subscription (e.g. change tier or status).
 * @param {string} userId - The user's ID.
 * @param {object} updates - Updates to apply.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function updateSubscription(userId, updates, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .update(updates)
    .eq("user_id", userId)
    .select()
    .single();

  if (error) {
    console.error("Error in updateSubscription:", error);
    throw error;
  }
  return data;
}

/**
 * Helper utility to determine the unified status state for display.
 * @param {object} subscription - The subscription row object.
 * @returns {'active' | 'inactive' | 'cancelled' | 'expired'}
 */
export function checkSubscriptionStatus(subscription) {
  if (!subscription) return "inactive";
  
  const now = new Date();
  const renewal = new Date(subscription.renewal_date);
  
  if (subscription.status === "canceled" || subscription.status === "cancelled") {
    if (renewal < now) {
      return "expired";
    }
    return "cancelled";
  }
  
  if (subscription.status === "past_due" || subscription.status === "unpaid") {
    return "expired";
  }
  
  if (subscription.status === "active" || subscription.status === "trialing") {
    return "active";
  }
  
  return "inactive";
}

/**
 * Fetch subscription plans from database.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function getSubscriptionPlans(supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("subscription_plans")
    .select("*")
    .order("amount", { ascending: true });

  if (error) {
    console.error("Error in getSubscriptionPlans:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return [];
  }
  return data;
}

/**
 * Reconcile a Stripe subscription state with the database.
 * @param {string} userId - User ID.
 * @param {string} stripeSubId - Stripe Subscription ID.
 * @param {string} priceId - Stripe Price ID.
 * @param {string} status - Stripe subscription status.
 * @param {string} renewalDate - Renewal date ISO string.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function syncStripeSubscriptionToDatabase(userId, stripeSubId, priceId, status, renewalDate, supabaseClient, cardBrand = null, cardLast4 = null, stripeCustomerId = null) {
  const supabase = supabaseClient || createClient();

  // 1. Fetch the plan details to get plan_name (scout, advocate, builder)
  const { data: plan, error: planError } = await supabase
    .from("subscription_plans")
    .select("plan_name")
    .eq("stripe_price_id", priceId)
    .maybeSingle();

  if (planError) {
    console.error("Error fetching plan in sync:", planError);
  }

  // Fallback mapping in case DB doesn't have it or contains a mismatch
  let planType = plan?.plan_name;
  if (!planType) {
    if (priceId.includes("scout")) planType = "scout";
    else if (priceId.includes("advocate")) planType = "advocate";
    else if (priceId.includes("builder")) planType = "builder";
    else planType = "scout";
  }

  let dbStatus = "active";
  if (status === "canceled" || status === "cancelled") {
    dbStatus = "canceled";
  } else if (status === "past_due") {
    dbStatus = "past_due";
  } else if (["active", "incomplete", "incomplete_expired", "trialing", "unpaid"].includes(status)) {
    dbStatus = status;
  }

  // Resolve Customer ID from profiles if not passed directly
  let customerId = stripeCustomerId;
  if (!customerId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .maybeSingle();
    customerId = profile?.stripe_customer_id || null;
  }

  // Fetch user email for temporary logging
  const { data: profileObj } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .maybeSingle();
  const userEmail = profileObj?.email || "Unknown Email";

  // Temporary logging for database synchronization audit
  console.log(`[Subscription Service Sync] Reconciling subscription for user ${userId}:`);
  console.log(`- Stripe Customer ID: ${customerId || "None"}`);
  console.log(`- Stripe Subscription ID: ${stripeSubId}`);
  console.log(`- User Email: ${userEmail}`);
  console.log(`- Plan Purchased (Price ID): ${priceId}`);
  console.log(`- Database Status: ${dbStatus}`);
  console.log(`- Renewal Date: ${renewalDate}`);

  // Check for existing subscription row
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  const subPayload = {
    user_id: userId,
    plan_type: planType,
    plan_name: planType, // Required Field
    status: dbStatus,
    renewal_date: renewalDate,
    stripe_subscription_id: stripeSubId,
    subscription_id: stripeSubId, // Required Field
    stripe_price_id: priceId,
    customer_id: customerId, // Required Field
    card_brand: cardBrand,
    card_last4: cardLast4,
  };

  if (existing) {
    // If updating and new card details are not provided but exist in the DB, preserve them
    if (cardBrand === null && existing.card_brand) {
      subPayload.card_brand = existing.card_brand;
    }
    if (cardLast4 === null && existing.card_last4) {
      subPayload.card_last4 = existing.card_last4;
    }

    // Keep existing customer_id if new one is null but existing is not
    if (customerId === null && existing.customer_id) {
      subPayload.customer_id = existing.customer_id;
    }

    const { data, error } = await supabase
      .from("subscriptions")
      .update(subPayload)
      .eq("user_id", userId)
      .select()
      .single();

    if (error) {
      console.error("Error in syncStripeSubscriptionToDatabase (update):", error);
      throw error;
    }
    return data;
  } else {
    const { data, error } = await supabase
      .from("subscriptions")
      .insert(subPayload)
      .select()
      .single();

    if (error) {
      console.error("Error in syncStripeSubscriptionToDatabase (insert):", error);
      throw error;
    }
    return data;
  }
}

/**
 * Fetch transaction payments for a user.
 * @param {string} userId - User ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function getUserPayments(userId, supabaseClient) {
  if (!userId) return [];
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("payments")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error in getUserPayments:", {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    return [];
  }
  return data;
}

