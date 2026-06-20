import { createClient } from "@/lib/supabase";

/**
 * Fetch the current active subscription for a user.
 * @param {string} userId - User ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function getSubscription(userId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    console.error("Error in getSubscription:", error);
    throw error;
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
  
  if (subscription.status === "canceled") {
    return "cancelled";
  }
  
  if (subscription.status === "past_due" || renewal < now) {
    return "expired";
  }
  
  if (subscription.status === "active") {
    return "active";
  }
  
  return "inactive";
}
