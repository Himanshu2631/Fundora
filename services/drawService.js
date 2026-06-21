import { createClient } from "@/lib/supabase";
import { validateDraw, validateDrawEntry, validateWinningNumbers, validateWinnerClaim, validateClaimReview } from "@/lib/drawValidation";
import { calculateTicketCount, generateTicketNumber, isTicketWinning, generateLotteryNumbers, calculateMatches, getPrizeCategory } from "@/lib/drawUtilities";

/**
 * Create a new monthly draw.
 * @param {object} drawData - Draw options (title, prize, month, year, draw_date, min_score, sponsor, status).
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The created draw.
 */
export async function createDraw(drawData, supabaseClient) {
  const supabase = supabaseClient || createClient();

  const valResult = validateDraw(drawData);
  if (!valResult.isValid) {
    throw new Error(valResult.error);
  }

  const { data, error } = await supabase
    .from("draws")
    .insert({
      title: drawData.title,
      prize: drawData.prize,
      month: parseInt(drawData.month, 10),
      year: parseInt(drawData.year, 10),
      draw_date: drawData.draw_date,
      min_score: parseInt(drawData.min_score, 10) || 0,
      sponsor: drawData.sponsor || "Sponsor",
      status: drawData.status || "upcoming",
      winning_numbers: drawData.winning_numbers || []
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating draw:", error);
    throw error;
  }
  return data;
}

/**
 * Fetch all draws, optionally filtered by status.
 * @param {string} [status] - Optional status filter ('upcoming', 'active', 'completed').
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} List of draws.
 */
export async function getDraws(status = null, supabaseClient) {
  const supabase = supabaseClient || createClient();
  let query = supabase.from("draws").select("*");
  
  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    console.error("Error fetching draws:", error);
    throw error;
  }
  return data || [];
}

/**
 * Get a single draw by ID.
 * @param {string} drawId - Draw ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The draw details.
 */
export async function getDrawById(drawId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("draws")
    .select("*")
    .eq("id", drawId)
    .single();

  if (error) {
    console.error(`Error fetching draw ${drawId}:`, error);
    throw error;
  }
  return data;
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
  
  const validStatuses = ["upcoming", "active", "completed"];
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
  }

  const { data, error } = await supabase
    .from("draws")
    .update({ status })
    .eq("id", drawId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating draw status ${drawId}:`, error);
    throw error;
  }
  return data;
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
    console.error(`Error fetching entries for user ${userId}:`, error);
    throw error;
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
    console.error(`Error fetching user ${userId} entries for draw ${drawId}:`, error);
    throw error;
  }
  return data || [];
}

/**
 * Generate draw tickets for an eligible user.
 * Calculates count from subscription tier and validates score threshold.
 * @param {string} userId - User ID.
 * @param {string} drawId - Target Draw ID.
 * @param {number} givingScore - Current user giving score.
 * @param {string} subscriptionTier - Plan type ('scout', 'advocate', 'builder').
 * @param {string} subscriptionStatus - Plan status ('active', 'cancelled').
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

  // 1. Fetch draw to obtain min_score requirements
  const draw = await getDrawById(drawId, supabase);
  if (!draw) {
    throw new Error("Draw not found.");
  }
  if (draw.status !== "active") {
    throw new Error("Draw is not active for submissions.");
  }

  // 2. Validate user eligibility
  const eligibility = validateDrawEntry(givingScore, draw.min_score, subscriptionStatus);
  if (!eligibility.isValid) {
    throw new Error(eligibility.error);
  }

  // 3. Verify if user already has entries for this draw (prevents duplication)
  const existing = await getUserEntriesForDraw(userId, drawId, supabase);
  if (existing && existing.length > 0) {
    return existing; // returns existing entries to keep operations idempotent
  }

  // 4. Calculate ticket counts
  const ticketCount = calculateTicketCount(subscriptionTier);
  if (ticketCount <= 0) {
    throw new Error("Your subscription tier does not qualify for any draw entries.");
  }

  // 5. Generate and insert tickets
  const entries = [];
  for (let i = 0; i < ticketCount; i++) {
    const ticketNum = generateTicketNumber(userId, drawId, i);
    
    const { data, error } = await supabase
      .from("draw_entries")
      .insert({
        user_id: userId,
        draw_id: drawId,
        ticket_number: ticketNum
      })
      .select()
      .single();

    if (error) {
      console.error(`Error inserting ticket ${ticketNum}:`, error);
      throw error;
    }
    entries.push(data);
  }

  return entries;
}

/**
 * Record winning tickets for a draw and transition it to completed.
 * @param {string} drawId - Draw ID.
 * @param {Array|string} winningNumbers - The winning numbers (e.g. ['FND-884-29A']).
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The completed draw object.
 */
export async function recordWinningNumbers(drawId, winningNumbers, supabaseClient) {
  const supabase = supabaseClient || createClient();

  const valResult = validateWinningNumbers(winningNumbers);
  if (!valResult.isValid) {
    throw new Error(valResult.error);
  }

  // standardise formatting as array of strings
  const formattedNumbers = Array.isArray(winningNumbers)
    ? winningNumbers
    : winningNumbers.split(",").map(num => num.trim());

  const { data, error } = await supabase
    .from("draws")
    .update({
      status: "completed",
      winning_numbers: formattedNumbers
    })
    .eq("id", drawId)
    .select()
    .single();

  if (error) {
    console.error(`Error recording winning numbers for draw ${drawId}:`, error);
    throw error;
  }
  return data;
}

/**
 * Identify matching winning user entries for a completed draw.
 * Calculates match counts between draw entries and draw winning numbers,
 * filters those with matches >= 3, and returns them along with their match counts and prize categories.
 * @param {string} drawId - Draw ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} List of winning entries matching winning numbers (matches >= 3).
 */
export async function getWinners(drawId, supabaseClient) {
  const supabase = supabaseClient || createClient();

  // 1. Fetch draw details
  const draw = await getDrawById(drawId, supabase);
  if (!draw) {
    throw new Error("Draw not found.");
  }
  if (draw.status !== "completed") {
    return []; // No winners calculated for incomplete draws
  }

  // 2. Fetch all entries registered under this draw
  const { data: entries, error } = await supabase
    .from("draw_entries")
    .select("*")
    .eq("draw_id", drawId);

  if (error) {
    console.error(`Error retrieving entries for winners check on draw ${drawId}:`, error);
    throw error;
  }

  if (!entries || entries.length === 0) return [];

  const winningNumbers = draw.generated_numbers || [];
  const winners = [];

  // 3. Filter entries that match >= 3 numbers in generated_numbers
  for (const entry of entries) {
    const entryNumbers = entry.numbers || [];
    const matchCount = calculateMatches(entryNumbers, winningNumbers);
    if (matchCount >= 3) {
      const prizeCategory = getPrizeCategory(matchCount);
      winners.push({
        ...entry,
        match_count: matchCount,
        prize_category: prizeCategory
      });
    }
  }

  return winners;
}

/**
 * Execute monthly draw generation of 5 unique numbers.
 * Enforces no duplicates, consistent formatting, and reproducible storage.
 * @param {string} drawId - Draw ID to execute.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The updated/completed draw.
 */
export async function generateDraw(drawId, supabaseClient) {
  const supabase = supabaseClient || createClient();

  // 1. Fetch draw details
  const draw = await getDrawById(drawId, supabase);
  if (!draw) {
    throw new Error("Draw not found.");
  }
  if (draw.status === "completed") {
    throw new Error("Draw has already been completed.");
  }

  // 2. Generate 5 unique lottery numbers
  const generatedNumbers = generateLotteryNumbers(5, 1, 99);

  // 3. Selection of winning tickets from entries pool
  // Fetch entries for this draw
  const { data: entries, error: entriesError } = await supabase
    .from("draw_entries")
    .select("ticket_number")
    .eq("draw_id", drawId);

  if (entriesError) {
    console.error(`Error fetching entries pool for draw ${drawId}:`, entriesError);
    throw entriesError;
  }

  let winningTickets = [];
  if (entries && entries.length > 0) {
    // Select up to 5 unique ticket numbers randomly from entries pool
    const pool = entries.map(e => e.ticket_number);
    // Shuffle pool
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    winningTickets = shuffled.slice(0, 5);
  }

  // If there are less than 5 entries, generate dummy winning ticket numbers in standard format
  if (winningTickets.length < 5) {
    const dummyNeeded = 5 - winningTickets.length;
    for (let i = 0; i < dummyNeeded; i++) {
      // Use mock user identifiers to maintain format consistency
      const dummyTicket = generateTicketNumber(`DUMMY-${i}`, drawId, i);
      winningTickets.push(dummyTicket);
    }
  }

  // 4. Update draw record in Supabase
  const timestamp = new Date().toISOString();
  const { data, error } = await supabase
    .from("draws")
    .update({
      status: "completed",
      winning_numbers: winningTickets, // Store winning tickets for raffle matching
      draw_month: draw.month,
      generated_numbers: generatedNumbers, // Store generated lottery numbers
      generated_timestamp: timestamp
    })
    .eq("id", drawId)
    .select()
    .single();

  if (error) {
    console.error("Error executing generateDraw:", error);
    throw error;
  }
  return data;
}

/**
 * Submit a winner claim for a completed draw entry.
 * @param {string} userId - User ID claiming the win.
 * @param {string} drawId - Draw ID.
 * @param {string} entryId - Draw entry ID.
 * @param {string} screenshotUrl - Screenshot verification URL.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The created claim.
 */
export async function submitWinnerClaim(userId, drawId, entryId, screenshotUrl, supabaseClient) {
  const supabase = supabaseClient || createClient();

  // 1. Validate claim payload
  const claimPayload = { entry_id: entryId, screenshot_url: screenshotUrl };
  const valResult = validateWinnerClaim(claimPayload);
  if (!valResult.isValid) {
    throw new Error(valResult.error);
  }

  // 2. Fetch draw details
  const draw = await getDrawById(drawId, supabase);
  if (!draw) {
    throw new Error("Draw not found.");
  }
  if (draw.status !== "completed") {
    throw new Error("Draw is not completed yet.");
  }

  // 3. Fetch entry details
  const { data: entry, error: entryError } = await supabase
    .from("draw_entries")
    .select("*")
    .eq("id", entryId)
    .single();

  if (entryError || !entry) {
    throw new Error("Draw entry not found.");
  }
  if (entry.user_id !== userId) {
    throw new Error("Entry does not belong to the user.");
  }
  if (entry.draw_id !== drawId) {
    throw new Error("Entry does not belong to the specified draw.");
  }

  // 4. Verify existing claim for this entry
  const { data: existingClaim, error: claimError } = await supabase
    .from("winner_claims")
    .select("*")
    .eq("entry_id", entryId)
    .maybeSingle();

  if (existingClaim) {
    throw new Error("A claim has already been submitted for this entry.");
  }

  // 5. Calculate matches to ensure it qualifies (matches >= 3)
  const entryNumbers = entry.numbers || [];
  const winningNumbers = draw.generated_numbers || [];
  const matchCount = calculateMatches(entryNumbers, winningNumbers);
  if (matchCount < 3) {
    throw new Error(`Entry does not qualify as a winner. Matches: ${matchCount}`);
  }

  const prizeCategory = getPrizeCategory(matchCount);

  // 6. Insert claim record
  const { data: claim, error: insertError } = await supabase
    .from("winner_claims")
    .insert({
      user_id: userId,
      draw_id: drawId,
      entry_id: entryId,
      match_count: matchCount,
      prize_category: prizeCategory,
      screenshot_url: screenshotUrl,
      status: "pending",
      submitted_at: new Date().toISOString()
    })
    .select()
    .single();

  if (insertError) {
    console.error("Error inserting winner claim:", insertError);
    throw insertError;
  }

  return claim;
}

/**
 * Admin method to retrieve all claim submissions.
 * @param {string} [status] - Optional status filter ('pending', 'approved', 'rejected', 'paid').
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} List of claims.
 */
export async function getWinnerClaims(status = null, supabaseClient) {
  const supabase = supabaseClient || createClient();
  let query = supabase.from("winner_claims").select("*");
  if (status) {
    query = query.eq("status", status);
  }
  const { data, error } = await query;
  if (error) {
    console.error("Error fetching winner claims:", error);
    throw error;
  }
  return data || [];
}

/**
 * Retrieve claim submissions for a specific user.
 * @param {string} userId - User ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} List of claims.
 */
export async function getUserClaims(userId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("winner_claims")
    .select("*")
    .eq("user_id", userId);
  if (error) {
    console.error(`Error fetching claims for user ${userId}:`, error);
    throw error;
  }
  return data || [];
}

/**
 * Admin method to update claim verification status.
 * Validates transitions to pending, approved, rejected, or paid.
 * @param {string} claimId - Claim ID.
 * @param {string} status - Target status ('pending', 'approved', 'rejected', 'paid').
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The updated claim.
 */
export async function reviewWinnerClaim(claimId, status, notes = "", supabaseClient) {
  const supabase = supabaseClient || createClient();

  // Validate status
  const valResult = validateClaimReview(status);
  if (!valResult.isValid) {
    throw new Error(valResult.error);
  }

  // Update claim
  const { data: updatedClaim, error } = await supabase
    .from("winner_claims")
    .update({ status, notes })
    .eq("id", claimId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating claim status for claim ${claimId}:`, error);
    throw error;
  }

  return updatedClaim;
}
