/**
 * Required observation window in seconds before initial viability assessment can be performed.
 * 48 hours = 48 * 3600 = 172,800 seconds.
 */
export const REQUIRED_48H_SECONDS = 172800;

/**
 * Determines whether a campaign is eligible for its first 48-hour ML viability assessment.
 *
 * Criteria for eligibility:
 * 1. Campaign object and valid ID exist.
 * 2. Campaign has a valid ISO launch timestamp (created_at).
 * 3. Server time has reached or exceeded 48 hours (>= 172,800 seconds) since launch.
 * 4. Campaign status is not cancelled, draft, or inactive.
 * 5. Campaign has not already received an assessment in campaign_viability_assessments.
 *
 * NOTE: This function executes strictly server-side and only inspects eligibility without
 * executing ML inference or inserting database records.
 *
 * @param {Object} campaign - Campaign/charity database row.
 * @param {Object} [options] - Configuration and context overrides.
 * @param {Date|string|number} [options.now] - Current server-time override (used for deterministic testing).
 * @param {boolean} [options.hasExistingAssessment] - Explicit flag indicating whether an assessment exists.
 * @param {Object} [options.supabaseClient] - Optional Supabase client to query existing assessments.
 * @returns {Promise<{ eligible: boolean, reason: string, elapsedSeconds: number|null, campaignId: string|null }>}
 */
export async function isCampaignViabilityAssessmentEligible(campaign, options = {}) {
  const campaignId = campaign?.id ? String(campaign.id) : null;

  if (!campaign || typeof campaign !== "object") {
    return {
      eligible: false,
      reason: "Invalid or missing campaign record.",
      elapsedSeconds: null,
      campaignId: null,
    };
  }

  if (!campaignId) {
    return {
      eligible: false,
      reason: "Campaign record is missing a valid identifier (id).",
      elapsedSeconds: null,
      campaignId: null,
    };
  }

  // 1. Verify launch timestamp
  const launchRaw = campaign.created_at || campaign.launch_date;
  if (!launchRaw) {
    return {
      eligible: false,
      reason: "Campaign is missing a required launch timestamp (created_at).",
      elapsedSeconds: null,
      campaignId,
    };
  }

  const launchMs = new Date(launchRaw).getTime();
  if (isNaN(launchMs)) {
    return {
      eligible: false,
      reason: `Campaign has an unparseable launch timestamp: "${launchRaw}".`,
      elapsedSeconds: null,
      campaignId,
    };
  }

  // 2. Determine current server-side reference time
  const nowMs = options.now !== undefined ? new Date(options.now).getTime() : Date.now();
  if (isNaN(nowMs)) {
    return {
      eligible: false,
      reason: "Invalid server reference time provided.",
      elapsedSeconds: null,
      campaignId,
    };
  }

  const elapsedSeconds = (nowMs - launchMs) / 1000.0;

  // 3. Temporal maturity checks
  if (elapsedSeconds < 0) {
    return {
      eligible: false,
      reason: `Campaign launch date is in the future (${Math.abs(Math.round(elapsedSeconds))}s until launch).`,
      elapsedSeconds,
      campaignId,
    };
  }

  if (elapsedSeconds < REQUIRED_48H_SECONDS) {
    const remainingSeconds = Math.round(REQUIRED_48H_SECONDS - elapsedSeconds);
    const remainingHours = (remainingSeconds / 3600.0).toFixed(1);
    return {
      eligible: false,
      reason: `Campaign has not reached 48-hour maturity (${remainingHours}h remaining; ${Math.round(elapsedSeconds)}s / ${REQUIRED_48H_SECONDS}s).`,
      elapsedSeconds,
      campaignId,
    };
  }

  // 4. Status validation (if present)
  if (campaign.status && typeof campaign.status === "string") {
    const statusLower = campaign.status.toLowerCase().trim();
    if (["draft", "cancelled", "canceled", "inactive", "suspended"].includes(statusLower)) {
      return {
        eligible: false,
        reason: `Campaign status "${campaign.status}" is not eligible for viability assessment.`,
        elapsedSeconds,
        campaignId,
      };
    }
  }

  // 5. Existing initial assessment check (idempotency protection)
  let hasExistingInitial = options.hasExistingInitialAssessment ?? options.hasExistingAssessment;
  if (hasExistingInitial === undefined && options.supabaseClient) {
    try {
      const { data, error } = await options.supabaseClient
        .from("campaign_viability_assessments")
        .select("id, assessment_type")
        .eq("campaign_id", campaignId)
        .eq("assessment_type", "initial_48h")
        .limit(1);

      if (!error && Array.isArray(data) && data.length > 0) {
        hasExistingInitial = true;
      }
    } catch {
      // In case of error querying assessments, do not block without confirmation
    }
  }

  if (hasExistingInitial) {
    return {
      eligible: false,
      reason: "Campaign has already received its initial 48-hour viability assessment.",
      elapsedSeconds,
      campaignId,
    };
  }

  // 6. Fully eligible
  return {
    eligible: true,
    reason: "Campaign has reached 48-hour maturity and is eligible for initial viability assessment.",
    elapsedSeconds,
    campaignId,
  };
}
