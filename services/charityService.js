import { createClient } from "@/lib/supabase";

/**
 * Fetch all vetted charities.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} List of charities.
 */
export async function getCharities(supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("charities")
    .select("*");
  
  if (error) {
    console.error("getCharities error:", error.code, error.message);
    return [];
  }
  // Normalise optional extended columns with safe fallbacks
  return (data || []).map(c => ({
    ...c,
    category: c.category || "General",
    impact: c.impact || "",
    why_matters: c.why_matters || "",
    auditor_score: c.auditor_score || "",
    spending_ratio: c.spending_ratio || "",
    raised: c.raised || "$0",
  }));
}

/**
 * Fetch all active selections/allocations for a user, merged with charity details.
 * @param {string} userId - The user's ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} User allocations merged with charity details.
 */
export async function getUserAllocations(userId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  
  // 1. Fetch selections — gracefully handle table not yet migrated
  const { data: selections, error: selError } = await supabase
    .from("user_charity_selections")
    .select("*")
    .eq("user_id", userId);
  
  if (selError) {
    // PGRST205 = table doesn't exist yet — not a crash, just return empty
    if (selError.code === "PGRST205" || selError.code === "42P01") {
      return [];
    }
    console.error("getUserAllocations error:", selError.code, selError.message);
    return [];
  }

  if (!selections || selections.length === 0) return [];

  // 2. Fetch charities
  const charities = await getCharities(supabase);

  // 3. Merge details
  return selections.map(sel => {
    const charity = charities.find(c => c.id === sel.charity_id);
    return {
      ...sel,
      charity_name: charity?.name || "Unknown Cause",
      charity_category: charity?.category || "General",
      charity_image: charity?.image_url || "/placeholder-charity.png",
      charity_description: charity?.description || "",
      charity_impact: charity?.impact || ""
    };
  }).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
}

/**
 * Add or update an allocation percentage for a charity selection.
 * @param {string} userId - The user's ID.
 * @param {string} charityId - The charity ID to select.
 * @param {number|string} percentage - Percentage (integer 10-100).
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function allocateCharity(userId, charityId, percentage, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const percentNum = parseInt(percentage, 10);

  // 1. Validate individual limits
  if (isNaN(percentNum) || percentNum < 10) {
    throw new Error("Minimum contribution allocation is 10%.");
  }
  if (percentNum > 100) {
    throw new Error("Maximum contribution allocation is 100%.");
  }

  // 2. Fetch existing allocations
  const { data: existing, error: fetchError } = await supabase
    .from("user_charity_selections")
    .select("*")
    .eq("user_id", userId);

  if (fetchError) {
    if (fetchError.code === "PGRST205" || fetchError.code === "42P01") {
      throw new Error("Charity selections are not available yet. Please run the database migration.");
    }
    console.error("allocateCharity fetch error:", fetchError.code, fetchError.message);
    throw fetchError;
  }

  // Calculate sum of other allocations
  const otherAllocationsSum = (existing || [])
    .filter(s => s.charity_id !== charityId)
    .reduce((sum, s) => sum + s.contribution_percentage, 0);

  if (otherAllocationsSum + percentNum > 100) {
    throw new Error(`Total allocations cannot exceed 100%. Currently allocated: ${otherAllocationsSum}%, remaining possible: ${100 - otherAllocationsSum}%.`);
  }

  // 3. Upsert using insert
  const { data, error } = await supabase
    .from("user_charity_selections")
    .insert({
      user_id: userId,
      charity_id: charityId,
      contribution_percentage: percentNum
    })
    .select()
    .single();

  if (error) {
    console.error("Error upserting charity allocation:", error);
    throw error;
  }
  return data;
}

/**
 * Remove a charity allocation by charity ID.
 * @param {string} userId - The user's ID.
 * @param {string} charityId - The charity ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function removeAllocation(userId, charityId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { error } = await supabase
    .from("user_charity_selections")
    .delete()
    .eq("charity_id", charityId);

  if (error) {
    console.error("Error removing allocation:", error);
    throw error;
  }
}

/**
 * Onboard a new charity (Admin operation).
 * @param {object} charityData - The fields of the new charity.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The created charity.
 */
export async function createCharity(charityData, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("charities")
    .insert(charityData)
    .select()
    .single();

  if (error) {
    console.error("Error in createCharity:", error);
    throw error;
  }
  return data;
}

/**
 * Update charity details (Admin operation).
 * @param {string} charityId - Target charity ID.
 * @param {object} updates - Updates object.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The updated charity.
 */
export async function updateCharity(charityId, updates, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("charities")
    .update(updates)
    .eq("id", charityId)
    .select()
    .single();

  if (error) {
    console.error("Error in updateCharity:", error);
    throw error;
  }
  return data;
}

/**
 * Remove a charity (Admin operation).
 * @param {string} charityId - Target charity ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function deleteCharity(charityId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { error } = await supabase
    .from("charities")
    .delete()
    .eq("id", charityId);

  if (error) {
    console.error("Error in deleteCharity:", error);
    throw error;
  }
}
