/**
 * Server-side orchestration runner for the Phase 4.3 automated 48-hour
 * campaign viability assessment pipeline.
 *
 * This module is PURE ORCHESTRATION. It does not implement ML feature
 * construction, FastAPI communication, or Supabase insertion itself - those
 * responsibilities belong to the Phase 4.2 modules it imports below.
 *
 * Flow:
 *   campaignId
 *       |
 *   load campaign from Supabase (charities table)
 *       |
 *   isCampaignViabilityAssessmentEligible()
 *       |
 *   NOT ELIGIBLE --------> return { success: true, skipped: true, reason }
 *       |
 *       |
 *   assessCampaignViability()
 *       |  |-- buildCampaignViabilityPayload()  [Phase 4.2]
 *       |  |-- predictCampaignViability()       [Phase 4.2]
 *       |  |-- storeViabilityAssessment()       [Phase 4.2]
 *       |
 *   SUCCESS -> return { success: true, skipped: false, assessmentId, assessment }
 *
 * DB-level duplicate protection:
 *   The unique partial index idx_unique_campaign_initial_48h_assessment on
 *   campaign_viability_assessments (campaign_id) WHERE assessment_type='initial_48h'
 *   prevents duplicate rows even if two processes pass the application-level
 *   eligibility check simultaneously. The runner detects this Postgres conflict
 *   and converts it into a clean "already assessed" skip result.
 *
 * SECURITY:
 *   Server-side only. Do NOT import into client components.
 *   ML_API_URL, Supabase credentials, and donor data remain server-private.
 */

import { isCampaignViabilityAssessmentEligible } from "./eligibilityService.js";
import { assessCampaignViability } from "./assessmentService.js";
import { classifyAssessmentFailure } from "./failureClassifier.js";

/**
 * Postgres/Supabase error codes and message fragments that indicate a unique
 * constraint violation on the initial_48h partial index. Used to distinguish
 * a race-condition duplicate from a genuine storage failure.
 *
 * Supabase returns PostgreSQL error code 23505 for unique_violation.
 */
const UNIQUE_VIOLATION_CODE = "23505";
const UNIQUE_VIOLATION_FRAGMENT = "idx_unique_campaign_initial_48h_assessment";

/**
 * Returns true if the Supabase insert error represents a duplicate
 * initial_48h assessment conflict (race condition idempotency case).
 *
 * @param {Object} err - Error thrown by storeViabilityAssessment.
 * @returns {boolean}
 */
function isDuplicateAssessmentError(err) {
  if (!err || typeof err.message !== "string") return false;
  const msg = err.message;
  return (
    msg.includes(UNIQUE_VIOLATION_CODE) ||
    msg.includes(UNIQUE_VIOLATION_FRAGMENT) ||
    msg.toLowerCase().includes("unique") ||
    msg.toLowerCase().includes("duplicate")
  );
}

/**
 * Executes the full automated 48-hour viability assessment pipeline for a
 * single campaign in a safe, idempotent manner.
 *
 * Steps:
 * 1. Validates campaignId.
 * 2. Loads the campaign record from Supabase.
 * 3. Runs the Phase 4.3 eligibility check (48-hour maturity + no existing
 *    initial assessment).
 * 4. If ineligible: returns a clean skip result without calling FastAPI.
 * 5. If eligible: delegates to assessCampaignViability() which orchestrates
 *    payload construction, ML inference, and Supabase storage.
 * 6. Handles DB-level duplicate violations (race conditions) as clean skips.
 * 7. Returns a structured result in all paths.
 *
 * @param {string} campaignId - UUID of the campaign/charity to assess.
 * @param {Object} [options] - Optional overrides for testing and configuration.
 * @param {Object} [options.supabaseClient] - Server-side Supabase client override.
 * @param {Date|string|number} [options.now] - Reference time override (for testing).
 * @param {boolean} [options.hasExistingInitialAssessment] - Explicit existing
 *   assessment flag to skip the DB query (for callers that pre-fetched this).
 * @param {number} [options.targetGoal=10000.0] - Default goal if campaign record
 *   has no goal value.
 * @param {string} [options.country="US"] - Default country code fallback.
 * @returns {Promise<Object>} Structured result:
 *   - SUCCESS:  { success: true,  skipped: false, campaignId, assessmentId, assessment }
 *   - SKIPPED:  { success: true,  skipped: true,  campaignId, reason }
 *   - FAILURE:  { success: false, skipped: false, campaignId, reason }
 */
export async function runCampaignViabilityAssessment(campaignId, options = {}) {
  // 1. Validate campaignId
  if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
    return {
      success: false,
      skipped: false,
      campaignId: campaignId ?? null,
      reason: "Invalid or missing campaignId.",
      retryable: false,
      errorCategory: "invalid_campaign_data",
    };
  }

  const cleanCampaignId = campaignId.trim();

  // 2. Resolve Supabase client
  let supabase = options.supabaseClient ?? null;
  if (!supabase) {
    try {
      const { createServer } = await import("../supabase-server.js");
      supabase = await createServer();
    } catch {
      return {
        success: false,
        skipped: false,
        campaignId: cleanCampaignId,
        reason: "Failed to initialise Supabase server client.",
        retryable: true,
        errorCategory: "database_client_init_error",
      };
    }
  }

  // 3. Load campaign record from charities table
  let campaign;
  try {
    const { data, error } = await supabase
      .from("charities")
      .select("*")
      .eq("id", cleanCampaignId)
      .maybeSingle();

    if (error) {
      return {
        success: false,
        skipped: false,
        campaignId: cleanCampaignId,
        reason: "Failed to load campaign record.",
        retryable: true,
        errorCategory: "database_transient_error",
      };
    }

    if (!data) {
      return {
        success: false,
        skipped: false,
        campaignId: cleanCampaignId,
        reason: "Campaign \"" + cleanCampaignId + "\" was not found.",
        retryable: false,
        errorCategory: "not_found",
      };
    }

    campaign = data;
  } catch {
    return {
      success: false,
      skipped: false,
      campaignId: cleanCampaignId,
      reason: "Unexpected error loading campaign record.",
      retryable: true,
      errorCategory: "database_transient_error",
    };
  }

  // 4. Eligibility check
  //
  // Pass the supabaseClient so isCampaignViabilityAssessmentEligible can query
  // campaign_viability_assessments for an existing initial_48h record,
  // unless the caller has already supplied hasExistingInitialAssessment.
  let eligibility;
  try {
    eligibility = await isCampaignViabilityAssessmentEligible(campaign, {
      now: options.now,
      hasExistingInitialAssessment: options.hasExistingInitialAssessment,
      hasExistingAssessment: options.hasExistingAssessment,
      supabaseClient: supabase,
    });
  } catch {
    return {
      success: false,
      skipped: false,
      campaignId: cleanCampaignId,
      reason: "Eligibility check encountered an unexpected error.",
      retryable: false,
      errorCategory: "ineligible_status",
    };
  }

  if (!eligibility.eligible) {
    return {
      success: true,
      skipped: true,
      campaignId: cleanCampaignId,
      reason: eligibility.reason,
    };
  }

  // 5. Run Phase 4.2 assessment pipeline
  //
  // assessCampaignViability() internally calls:
  //   buildCampaignViabilityPayload() -- 48-hour ML feature construction
  //   predictCampaignViability()      -- FastAPI ML inference
  //   storeViabilityAssessment()      -- Supabase insertion
  //
  // The runner passes the shared supabaseClient so all three operations
  // reuse a single authenticated connection within this execution.
  try {
    const result = await assessCampaignViability(cleanCampaignId, {
      supabaseClient: supabase,
      targetGoal: options.targetGoal,
      country: options.country,
      assessment_type: "initial_48h",
    });

    return {
      success: true,
      skipped: false,
      campaignId: cleanCampaignId,
      assessmentId: result.assessment_id ?? null,
      assessment: result.prediction ?? null,
    };
  } catch (err) {
    // 6. Race-condition idempotency: DB unique violation
    //
    // If another process inserted an initial_48h assessment between our
    // eligibility check and the INSERT, the DB unique partial index fires.
    // Treat this as a clean "already assessed" skip rather than a failure.
    if (isDuplicateAssessmentError(err)) {
      return {
        success: true,
        skipped: true,
        campaignId: cleanCampaignId,
        reason:
          "Initial 48-hour assessment was already created by a concurrent process.",
      };
    }

    // 7. Structured failure for all other errors
    //
    // Surface a safe, non-sensitive reason string. The original error message
    // from assessCampaignViability may contain "ML service error:", "Failed to
    // load campaign data:", or "Failed to persist assessment in Supabase:" --
    // these are safe to forward since they contain no credentials or secrets.
    const safeReason =
      err && typeof err.message === "string"
        ? err.message
        : "Assessment pipeline encountered an unexpected error.";

    const classification = classifyAssessmentFailure(safeReason, err);

    return {
      success: false,
      skipped: false,
      campaignId: cleanCampaignId,
      reason: safeReason,
      retryable: classification.isRetryable,
      errorCategory: classification.category,
    };
  }
}