/**
 * Cutoff boundary for 48-hour early feature extraction in seconds.
 * 48 hours = 48 * 3600 = 172,800 seconds.
 */
const MAX_48H_SECONDS = 172800;

/**
 * Builds a validated, 48-hour boundary-compliant payload from Supabase campaign data
 * formatted specifically for the FastAPI ML viability prediction service.
 *
 * NOTE: This function executes strictly server-side and never exposes final `raised`
 * or post-48h temporal signals to prevent data leakage.
 *
 * @param {string} campaignId - Unique UUID or ID of the campaign/charity.
 * @param {Object} [options] - Optional configuration and client overrides.
 * @param {Object} [options.supabaseClient] - Optional authenticated Supabase server client.
 * @param {number} [options.targetGoal=10000.0] - Target goal amount (must be > 0).
 * @param {string} [options.country="US"] - Default country code if omitted from record.
 * @returns {Promise<Object>} Validated FastAPI CampaignAssessmentRequest payload.
 * @throws {Error} If campaign is missing, required fields are invalid, or goal is non-positive.
 */
export async function buildCampaignViabilityPayload(
  campaignId,
  { supabaseClient, targetGoal = 10000.0, country = "US" } = {}
) {
  if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
    throw new Error("Valid campaignId string is required.");
  }

  const cleanCampaignId = campaignId.trim();
  let supabase = supabaseClient;
  if (!supabase) {
    const { createServer } = await import("../supabase-server.js");
    supabase = await createServer();
  }

  // 1. Fetch core campaign/charity record
  const { data: campaign, error: campaignError } = await supabase
    .from("charities")
    .select("*")
    .eq("id", cleanCampaignId)
    .maybeSingle();

  if (campaignError) {
    throw new Error(`Failed to load campaign data: ${campaignError.message}`);
  }

  if (!campaign) {
    throw new Error(`Campaign with ID "${cleanCampaignId}" was not found.`);
  }

  // 2. Validate required metadata fields
  if (!campaign.name || !campaign.name.trim()) {
    throw new Error(`Campaign "${cleanCampaignId}" is missing a required name/title.`);
  }

  if (!campaign.description || !campaign.description.trim()) {
    throw new Error(`Campaign "${cleanCampaignId}" is missing a required description/story.`);
  }

  if (!campaign.created_at) {
    throw new Error(`Campaign "${cleanCampaignId}" is missing a launch timestamp (created_at).`);
  }

  const launchMs = new Date(campaign.created_at).getTime();
  if (isNaN(launchMs)) {
    throw new Error(`Campaign "${cleanCampaignId}" has an invalid launch_date timestamp.`);
  }

  // Determine numerical goal (> 0 required by ML service)
  const rawGoal = campaign.goal !== undefined && campaign.goal !== null ? Number(campaign.goal) : targetGoal;
  const goal = Number(rawGoal);
  if (isNaN(goal) || goal <= 0) {
    throw new Error(`Campaign goal must be a positive number greater than 0 (received: ${rawGoal}).`);
  }

  // Build composite description incorporating why_matters & impact if available
  let fullDescription = campaign.description.trim();
  if (campaign.why_matters && campaign.why_matters.trim()) {
    fullDescription += ` Why it matters: ${campaign.why_matters.trim()}`;
  }
  if (campaign.impact && campaign.impact.trim()) {
    fullDescription += ` Impact: ${campaign.impact.trim()}`;
  }

  // 3. Query early donor allocations/contributions
  const { data: selections, error: selError } = await supabase
    .from("user_charity_selections")
    .select("id, created_at, contribution_percentage")
    .eq("charity_id", cleanCampaignId);

  if (selError) {
    console.warn(`[buildCampaignViabilityPayload] Warning fetching allocations: ${selError.message}`);
  }

  // 4. Filter events strictly to the first 48 hours (0 <= seconds_elapsed <= 172800)
  const donations = [];
  if (Array.isArray(selections)) {
    for (const sel of selections) {
      if (!sel.created_at) continue;
      const eventMs = new Date(sel.created_at).getTime();
      if (isNaN(eventMs)) continue;

      const secondsElapsed = (eventMs - launchMs) / 1000.0;

      // Strict 48-hour boundary check
      if (secondsElapsed >= 0 && secondsElapsed <= MAX_48H_SECONDS) {
        const amount = Math.max(10.0, Number((sel.contribution_percentage || 10) * 5.0));
        donations.push({
          amount,
          seconds_elapsed: Math.round(secondsElapsed * 100) / 100,
        });
      }
    }
  }

  // Sort chronological order for consistency
  donations.sort((a, b) => a.seconds_elapsed - b.seconds_elapsed);

  // 5. Available image metadata
  const hasCoverPhoto = Boolean(campaign.image_url && campaign.image_url.trim());

  // 6. Return strictly validated FastAPI payload (excluding raw aggregate raised amounts)
  return {
    campaign_id: String(campaign.id),
    title: campaign.name.trim(),
    description: fullDescription,
    goal,
    category: String(campaign.category || "General").trim(),
    country: String(campaign.country || country || "US").trim(),
    launch_date: new Date(launchMs).toISOString(),
    donations,
    updates: [],
    comments: [],
    has_cover_photo: hasCoverPhoto,
    num_body_photos: 0,
  };
}
