import {
  IMPACT_ACTIONS,
  getUserImpactEvents,
  calculateTotalImpactScore,
  recordImpactEvent
} from "./impactScoreService";

import { createClient } from "@/lib/supabase";
import { validateImpactScore } from "@/lib/impactValidation";

export { IMPACT_ACTIONS, getUserImpactEvents, calculateTotalImpactScore, recordImpactEvent };

/**
 * Fetch all impact scores/events for a user, sorted reverse-chronologically.
 * @param {string} userId - The user's ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<Array>} Sorted impact scores array.
 */
export async function getUserImpactScores(userId, supabaseClient) {
  return getUserImpactEvents(userId, supabaseClient);
}

/**
 * Add a new impact score/event for the user.
 * @param {string} userId - The user's ID.
 * @param {number|string} scoreVal - Impact score value.
 * @param {string} scoreDate - Score date (YYYY-MM-DD).
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The newly inserted impact score object.
 */
export async function addImpactScore(userId, scoreVal, scoreDate, supabaseClient) {
  return recordImpactEvent(userId, {
    action: "manual_log",
    points: scoreVal,
    scoreDate: scoreDate,
    description: `Logged Impact Score (+${scoreVal} pts)`
  }, supabaseClient);
}

/**
 * Delete an impact score by ID.
 * @param {string} scoreId - The score ID.
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 */
export async function deleteImpactScore(scoreId, supabaseClient) {
  const supabase = supabaseClient || createClient();
  const { error } = await supabase
    .from("scores")
    .delete()
    .eq("id", scoreId);

  if (error) {
    console.error("Error in deleteImpactScore:", error.code, error.message, error.details);
    throw new Error(error.message || "Failed to delete impact score from database");
  }
}

/**
 * Update an existing impact score record.
 * @param {string} scoreId - The score ID.
 * @param {string} userId - The user's ID.
 * @param {object} updates - Attributes to update (score, score_date, action, description).
 * @param {object} [supabaseClient] - Optional server-side Supabase client.
 * @returns {Promise<object>} The updated impact score row.
 */
export async function updateImpactScore(scoreId, userId, updates, supabaseClient) {
  const supabase = supabaseClient || createClient();
  
  const existingScores = await getUserImpactScores(userId, supabase);
  const currentScoreRow = existingScores.find(s => s.id === scoreId);
  if (!currentScoreRow) {
    throw new Error("Impact score record not found.");
  }

  const scoreVal = updates.score !== undefined ? updates.score : currentScoreRow.score;
  const scoreDate = updates.score_date !== undefined ? updates.score_date : currentScoreRow.score_date;
  const action = updates.action !== undefined ? updates.action : currentScoreRow.action || "manual_log";
  const description = updates.description !== undefined ? updates.description : currentScoreRow.description || "Logged Impact Score";

  const { data, error } = await supabase
    .from("scores")
    .update({
      score: parseInt(scoreVal, 10),
      score_date: scoreDate,
      action: action,
      description: description
    })
    .eq("id", scoreId)
    .select()
    .single();

  if (error) {
    console.error("Error updating impact score:", error.code, error.message, error.details);
    throw new Error(error.message || "Failed to update impact score in database");
  }

  return data;
}

// Backward-compatibility exports
export const getUserScores = getUserImpactScores;
export const addScore = addImpactScore;
export const deleteScore = deleteImpactScore;
export const updateScore = updateImpactScore;
