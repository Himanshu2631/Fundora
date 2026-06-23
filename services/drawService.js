import { createClient } from "@/lib/supabase";

// ─── Status constants matching real DB constraint ────────────────────────────
// Real DB: status IN ('upcoming', 'drawn', 'cancelled')
// The code previously used 'active' and 'completed' — those DO NOT exist in DB.
export const DRAW_STATUS = {
  UPCOMING: "upcoming",
  ACTIVE: "active",
  DRAWN: "drawn",
  COMPLETED: "completed",
  CANCELLED: "cancelled",
};

/**
 * Normalise a status value from code conventions to real DB values.
 */
function normaliseStatus(status) {
  if (!status) return null;
  const map = { canceled: "cancelled" };
  return map[status] || status;
}

/**
 * Fetch all draws, optionally filtered by status.
 * @param {string} [status] - Optional status filter.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} List of draws.
 */
export async function getDraws(status = null, supabaseClient) {
  const supabase = supabaseClient || createClient();
  let query = supabase.from("draws").select("*").order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", normaliseStatus(status));
  }

  const { data, error } = await query;
  if (error) {
    // Log readable error details — Supabase error props are non-enumerable
    console.error("getDraws error:", error.code, error.message, error.details);
    return [];
  }
  return (data || []).map(normaliseDraw);
}

/**
 * Get a single draw by ID.
 * @param {string} drawId - Draw ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object|null>} The draw or null.
 */
export async function getDrawById(drawId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("draws")
    .select("*")
    .eq("id", drawId)
    .maybeSingle();

  if (error) {
    console.error(`getDrawById(${drawId}) error:`, error.code, error.message);
    return null;
  }
  return data ? normaliseDraw(data) : null;
}

/**
 * Normalise a draw row — adds virtual fields the UI expects from the
 * extended schema columns (title, prize, status aliases etc).
 */
function normaliseDraw(draw) {
  if (!draw) return null;
  return {
    ...draw,
    // Status aliases for UI compatibility
    status: draw.status === "drawn" ? "completed" : draw.status,
    // Derived display fields with safe fallbacks
    title: draw.title || `Draw ${draw.month || draw.id?.substring(0, 6) || ""}`,
    prize: draw.prize || "Exclusive Prize",
    prize_value: draw.prize_value || null,
    min_score: draw.min_score || 0,
    sponsor: draw.sponsor || "Fundora Foundation",
    draw_date: draw.draw_date || null,
    generated_numbers: draw.generated_numbers || [],
    winning_numbers: draw.winning_numbers || [],
  };
}

/**
 * Create a new monthly draw.
 * @param {object} drawData - Draw options.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The created draw.
 */
export async function createDraw(drawData, supabaseClient) {
  const supabase = supabaseClient || createClient();

  if (!drawData.month) {
    throw new Error("Draw month is required (format: YYYY-MM).");
  }

  const payload = {
    month: drawData.month,
    title: drawData.title || null,
    prize: drawData.prize || null,
    prize_value: drawData.prize_value ? parseFloat(drawData.prize_value) : null,
    min_score: drawData.min_score ? parseInt(drawData.min_score, 10) : 0,
    sponsor: drawData.sponsor || "Fundora Foundation",
    draw_date: drawData.draw_date || null,
    status: normaliseStatus(drawData.status) || "upcoming",
    winning_numbers: drawData.winning_numbers || [],
  };

  const { data, error } = await supabase
    .from("draws")
    .insert(payload)
    .select()
    .single();

  if (error) {
    console.error("createDraw error:", error.code, error.message);
    throw new Error(error.message || "Failed to create draw");
  }
  return normaliseDraw(data);
}

/**
 * Transition the status of a draw.
 * @param {string} drawId - Draw ID.
 * @param {string} status - New status.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The updated draw.
 */
export async function updateDrawStatus(drawId, status, supabaseClient) {
  const supabase = supabaseClient || createClient();

  const normStatus = normaliseStatus(status);
  const validStatuses = ["upcoming", "active", "drawn", "completed", "cancelled"];
  if (!validStatuses.includes(normStatus)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const { data, error } = await supabase
    .from("draws")
    .update({ status: normStatus })
    .eq("id", drawId)
    .select()
    .single();

  if (error) {
    console.error(`updateDrawStatus(${drawId}) error:`, error.code, error.message);
    throw new Error(error.message || "Failed to update draw status");
  }
  return normaliseDraw(data);
}

/**
 * Fetch all entries registered by a user.
 * @param {string} userId - User ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} List of draw entries.
 */
export async function getUserEntries(userId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("draw_entries")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error(`getUserEntries(${userId}) error:`, error.code, error.message);
    return [];
  }
  return data || [];
}

/**
 * Fetch a user's entries for a specific draw.
 * @param {string} userId - User ID.
 * @param {string} drawId - Draw ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} List of user draw entries.
 */
export async function getUserEntriesForDraw(userId, drawId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("draw_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("draw_id", drawId);

  if (error) {
    console.error(`getUserEntriesForDraw error:`, error.code, error.message);
    return [];
  }
  return data || [];
}

/**
 * Generate draw entries for an eligible user.
 * Simplified for real schema — draw_entries only has user_id + draw_id.
 * @param {string} userId - User ID.
 * @param {string} drawId - Target Draw ID.
 * @param {number} givingScore - Current user giving score.
 * @param {string} subscriptionTier - Plan type ('scout', 'advocate', 'builder').
 * @param {string} subscriptionStatus - Plan status ('active', etc.).
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} The generated entries.
 */
export async function generateEntriesForUser(
  userId,
  drawId,
  givingScore,
  subscriptionTier,
  subscriptionStatus,
  supabaseClient
) {
  const supabase = supabaseClient || createClient();

  if (!subscriptionStatus || !["active", "trialing"].includes(subscriptionStatus)) {
    throw new Error("An active subscription is required to enter draws.");
  }

  // Determine ticket count based on tier
  let entryCount = 1;
  if (subscriptionTier === "builder") {
    entryCount = 10;
  } else if (subscriptionTier === "advocate") {
    entryCount = 3;
  }

  // Check if user already has entries for this draw
  const existing = await getUserEntriesForDraw(userId, drawId, supabase);
  if (existing.length > 0) {
    return existing;
  }

  // Generate and insert the entries
  const newEntries = [];
  for (let idx = 0; idx < entryCount; idx++) {
    // Generate 5 unique random numbers between 1 and 99
    const numsSet = new Set();
    while (numsSet.size < 5) {
      numsSet.add(Math.floor(Math.random() * 99) + 1);
    }
    const numbers = Array.from(numsSet).sort((a, b) => a - b);
    
    // Generate a unique ticket number
    // Format: FND-XXX-XXX
    const randomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
    const ticketNumber = `FND-${randomCode.substring(0, 3)}-${randomCode.substring(3, 6)}`;

    newEntries.push({
      user_id: userId,
      draw_id: drawId,
      ticket_number: ticketNumber,
      numbers: numbers
    });
  }

  const { data, error } = await supabase
    .from("draw_entries")
    .insert(newEntries)
    .select();

  if (error) {
    console.error("generateEntriesForUser error:", error.code, error.message);
    throw new Error(error.message || "Failed to register draw entries");
  }
  return data;
}

/**
 * Unregister a user from a specific draw (deletes their draw_entries).
 * @param {string} userId - User ID.
 * @param {string} drawId - Draw ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function unregisterFromDraw(userId, drawId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { error } = await supabase
    .from("draw_entries")
    .delete()
    .eq("user_id", userId)
    .eq("draw_id", drawId);

  if (error) {
    console.error("unregisterFromDraw error:", error.code, error.message);
    throw new Error(error.message || "Failed to unregister from draw");
  }
  return true;
}

/**
 * Get total entries count for a specific draw.
 * @param {string} drawId - Draw ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function getDrawParticipantsCount(drawId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error, count } = await supabase
    .from("draw_entries")
    .select("id", { count: "exact", head: true })
    .eq("draw_id", drawId);

  if (error) {
    console.error("getDrawParticipantsCount error:", error.code, error.message);
    return 0;
  }
  return count !== null && count !== undefined ? count : (data ? data.length : 0);
}

/**
 * Record winning numbers for a draw and transition it to drawn.
 * @param {string} drawId - Draw ID.
 * @param {Array<number>} winningNumbers - The winning numbers.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The completed draw object.
 */
export async function recordWinningNumbers(drawId, winningNumbers, supabaseClient) {
  const supabase = supabaseClient || createClient();

  const formattedNumbers = Array.isArray(winningNumbers)
    ? winningNumbers.map(Number).filter(n => !isNaN(n))
    : [];

  const { data, error } = await supabase
    .from("draws")
    .update({
      status: "completed",
      winning_numbers: formattedNumbers,
      generated_numbers: formattedNumbers,
      generated_timestamp: new Date().toISOString(),
    })
    .eq("id", drawId)
    .select()
    .single();

  if (error) {
    console.error(`recordWinningNumbers(${drawId}) error:`, error.code, error.message);
    throw new Error(error.message || "Failed to record winning numbers");
  }
  return normaliseDraw(data);
}

/**
 * Execute monthly draw — generates 5 random numbers and marks draw as drawn.
 * @param {string} drawId - Draw ID to execute.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The completed draw.
 */
export async function generateDraw(drawId, supabaseClient) {
  const supabase = supabaseClient || createClient();

  const draw = await getDrawById(drawId, supabase);
  if (!draw) throw new Error("Draw not found.");
  if (draw.status === "drawn") throw new Error("Draw has already been completed.");

  // Generate 5 unique numbers between 1–99
  const numbers = [];
  while (numbers.length < 5) {
    const n = Math.floor(Math.random() * 99) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }

  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("draws")
    .update({
      status: "completed",
      winning_numbers: numbers,
      generated_numbers: numbers,
      generated_timestamp: timestamp,
      draw_month: draw.draw_month || null,
    })
    .eq("id", drawId)
    .select()
    .single();

  if (error) {
    console.error("generateDraw error:", error.code, error.message);
    throw new Error(error.message || "Failed to complete draw");
  }
  return normaliseDraw(data);
}

// ─── Winner Submissions (replaces winner_claims in old code) ─────────────────

/**
 * Submit a winner claim for a completed draw entry.
 * Uses winner_submissions table (real schema) — NOT winner_claims.
 */
export async function submitWinnerClaim(userId, drawId, entryId, screenshotUrl, supabaseClient) {
  const supabase = supabaseClient || createClient();

  if (!screenshotUrl) throw new Error("Screenshot URL is required.");

  // Check existing submission
  const { data: existing } = await supabase
    .from("winner_submissions")
    .select("id")
    .eq("user_id", userId)
    .eq("draw_id", drawId)
    .maybeSingle();

  if (existing) throw new Error("A claim has already been submitted for this draw.");

  const { data, error } = await supabase
    .from("winner_submissions")
    .insert({
      user_id: userId,
      draw_id: drawId,
      entry_id: entryId || null,
      screenshot_url: screenshotUrl,
      status: "pending",
      submitted_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("submitWinnerClaim error:", error.code, error.message);
    throw new Error(error.message || "Failed to submit winner claim");
  }
  return data;
}

/**
 * Retrieve claim submissions for a specific user (from winner_submissions).
 */
export async function getUserClaims(userId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("winner_submissions")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error(`getUserClaims(${userId}) error:`, error.code, error.message);
    return [];
  }
  return data || [];
}

/**
 * Admin method to retrieve all claim submissions.
 */
export async function getWinnerClaims(status = null, supabaseClient) {
  const supabase = supabaseClient || createClient();
  let query = supabase.from("winner_submissions").select("*");
  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) {
    console.error("getWinnerClaims error:", error.code, error.message);
    return [];
  }
  return data || [];
}

/**
 * Admin method to update claim verification status.
 */
export async function reviewWinnerClaim(claimId, status, notes = "", supabaseClient) {
  const supabase = supabaseClient || createClient();

  const validStatuses = ["pending", "approved", "rejected"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const { data, error } = await supabase
    .from("winner_submissions")
    .update({ status, notes: notes || null })
    .eq("id", claimId)
    .select()
    .single();

  if (error) {
    console.error(`reviewWinnerClaim(${claimId}) error:`, error.code, error.message);
    throw new Error(error.message || "Failed to update claim status");
  }
  return data;
}

/**
 * Identify matching winning user entries for a completed draw.
 */
export async function getWinners(drawId, supabaseClient) {
  const supabase = supabaseClient || createClient();

  const draw = await getDrawById(drawId, supabase);
  if (!draw || draw.status !== "drawn") return [];

  const { data: entries, error } = await supabase
    .from("draw_entries")
    .select("*")
    .eq("draw_id", drawId);

  if (error) {
    console.error(`getWinners(${drawId}) error:`, error.code, error.message);
    return [];
  }

  return entries || [];
}

/**
 * Fetch all draw participation records for a user.
 */
export async function getDrawParticipations(userId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("draw_participation")
    .select("*")
    .eq("user_id", userId);

  if (error) {
    console.error(`getDrawParticipations error:`, error.code, error.message);
    return [];
  }
  return data || [];
}

/**
 * Update (upsert) draw participation state for a user.
 */
export async function updateDrawParticipation(userId, drawId, status, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("draw_participation")
    .upsert({
      user_id: userId,
      draw_id: drawId,
      status: status,
      updated_at: new Date().toISOString()
    }, { onConflict: "user_id,draw_id" })
    .select()
    .single();

  if (error) {
    console.error("updateDrawParticipation error:", error.code, error.message);
    throw new Error(error.message || "Failed to update participation state");
  }
  return data;
}
