import { createClient } from "@/lib/supabase";
import { validateScore } from "@/lib/scoreValidation";

/**
 * Fetch all scores for a user, sorted reverse-chronologically.
 * @param {string} userId - The user's ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} Sorted scores array.
 */
export async function getUserScores(userId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { data, error } = await supabase
    .from("scores")
    .select("*")
    .eq("user_id", userId);
  
  if (error) {
    if (error.code === "PGRST205" || error.code === "42P01") return [];
    console.error("getUserScores error:", error.code, error.message);
    return [];
  }

  // Sort reverse chronological: newest date first, then newest created_at first
  return (data || []).sort((a, b) => {
    const dateA = new Date(a.score_date);
    const dateB = new Date(b.score_date);
    if (dateA - dateB !== 0) return dateB - dateA;
    return new Date(b.created_at) - new Date(a.created_at);
  });
}

/**
 * Add a new score for the user, validating limits, duplicate dates,
 * and auto-evicting the oldest score if existing count is >= 5.
 * @param {string} userId - The user's ID.
 * @param {number|string} scoreVal - Golf score value.
 * @param {string} scoreDate - Score date (YYYY-MM-DD).
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The newly inserted score object.
 */
export async function addScore(userId, scoreVal, scoreDate, supabaseClient) {
  const supabase = supabaseClient || createClient();
  
  // 1. Fetch current scores
  const existingScores = await getUserScores(userId, supabase);

  // 2. Validate input parameters
  const validation = validateScore({
    score: scoreVal,
    scoreDate,
    existingScores
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // 3. Evict oldest if count >= 5
  if (existingScores.length >= 5) {
    // Sort reverse chronological: newest first. The oldest is at the end.
    const sorted = [...existingScores].sort((a, b) => {
      const dateA = new Date(a.score_date);
      const dateB = new Date(b.score_date);
      if (dateA - dateB !== 0) return dateB - dateA;
      return new Date(b.created_at) - new Date(a.created_at);
    });

    // Delete elements from index 4 onwards to ensure we leave space for exactly 5
    const toDelete = sorted.slice(4);
    for (const scoreToDel of toDelete) {
      const { error: delError } = await supabase
        .from("scores")
        .delete()
        .eq("id", scoreToDel.id);

      if (delError) {
        console.error("Error evicting oldest score:", delError.code, delError.message, delError.details);
        throw new Error(delError.message || "Failed to delete old score during eviction");
      }
    }
  }

  // 4. Insert new score
  const { data, error } = await supabase
    .from("scores")
    .insert({
      user_id: userId,
      score: parseInt(scoreVal, 10),
      score_date: scoreDate
    })
    .select()
    .single();

  if (error) {
    console.error("Error in addScore insert:", error.code, error.message, error.details);
    throw new Error(error.message || "Failed to insert score in database");
  }

  return data;
}

/**
 * Delete a score by ID.
 * @param {string} scoreId - The score ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function deleteScore(scoreId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { error } = await supabase
    .from("scores")
    .delete()
    .eq("id", scoreId);

  if (error) {
    console.error("Error in deleteScore:", error.code, error.message, error.details);
    throw new Error(error.message || "Failed to delete score from database");
  }
}

/**
 * Update an existing score record.
 * @param {string} scoreId - The score ID.
 * @param {string} userId - The user's ID.
 * @param {object} updates - Attributes to update (score, score_date).
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The updated score row.
 */
export async function updateScore(scoreId, userId, updates, supabaseClient) {
  const supabase = supabaseClient || createClient();
  
  // 1. Fetch current scores
  const existingScores = await getUserScores(userId, supabase);

  // 2. Validate. We need to check score and score_date if they are in updates
  const currentScoreRow = existingScores.find(s => s.id === scoreId);
  if (!currentScoreRow) {
    throw new Error("Score record not found.");
  }

  const scoreVal = updates.score !== undefined ? updates.score : currentScoreRow.score;
  const scoreDate = updates.score_date !== undefined ? updates.score_date : currentScoreRow.score_date;
  
  // Exclude the score being updated from duplicate date check
  const otherScores = existingScores.filter(s => s.id !== scoreId);

  const validation = validateScore({
    score: scoreVal,
    scoreDate,
    existingScores: otherScores
  });

  if (!validation.isValid) {
    throw new Error(validation.error);
  }

  // 3. Perform update
  const { data, error } = await supabase
    .from("scores")
    .update({
      score: parseInt(scoreVal, 10),
      score_date: scoreDate
    })
    .eq("id", scoreId)
    .select()
    .single();

  if (error) {
    console.error("Error updating score:", error.code, error.message, error.details);
    throw new Error(error.message || "Failed to update score in database");
  }

  return data;
}
