import { buildCampaignViabilityPayload } from "./payloadMapper.js";
import { predictCampaignViability } from "./fastapi.js";

/**
 * Stores a validated FastAPI viability prediction result in the Supabase
 * campaign_viability_assessments table.
 *
 * @param {string} campaignId - Unique UUID or ID of the campaign/charity.
 * @param {Object} prediction - Validated FastAPI ViabilityPredictionResponse.
 * @param {Object} [supabaseClient] - Optional authenticated Supabase server client.
 * @returns {Promise<Object>} The persisted database record.
 * @throws {Error} If Supabase insertion fails.
 */
export async function storeViabilityAssessment(campaignId, prediction, options = {}) {
  if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
    throw new Error("Valid campaignId is required to store viability assessment.");
  }
  if (!prediction || typeof prediction !== "object") {
    throw new Error("Valid prediction object is required to store viability assessment.");
  }

  const cleanCampaignId = campaignId.trim();
  const supabaseClient = options?.supabaseClient || (options && typeof options.from === "function" ? options : null);
  const assessmentType = (options && options.assessment_type) || "initial_48h";

  let supabase = supabaseClient;
  if (!supabase) {
    const { createServer } = await import("../supabase-server.js");
    supabase = await createServer();
  }

  // Format record strictly aligning with public.campaign_viability_assessments DDL schema
  const assessmentRecord = {
    campaign_id: cleanCampaignId,
    assessment_type: assessmentType,
    risk_probability: Math.round(Number(prediction.risk_probability) * 10000) / 10000,
    viability_score: parseInt(prediction.viability_score, 10),
    risk_level: String(prediction.risk_level),
    prediction_horizon_hours: Number(prediction.prediction_horizon_hours || 48),
    model_name: String(prediction.model?.name || "Random Forest Champion"),
    model_type: String(prediction.model?.model_type || "RandomForestClassifier"),
    n_features: Number(prediction.model?.n_features || 56),
    calibration: String(prediction.model?.calibration || "Platt Scaling (Sigmoid)"),
    base_rate_risk: Number(prediction.explanation?.base_rate_risk ?? 0.4996),
    top_risk_factors: Array.isArray(prediction.explanation?.top_risk_factors)
      ? prediction.explanation.top_risk_factors
      : [],
    top_supporting_factors: Array.isArray(prediction.explanation?.top_supporting_factors)
      ? prediction.explanation.top_supporting_factors
      : [],
    detailed_risk_factors: Array.isArray(prediction.explanation?.detailed_risk_factors)
      ? prediction.explanation.detailed_risk_factors
      : [],
    detailed_supporting_factors: Array.isArray(prediction.explanation?.detailed_supporting_factors)
      ? prediction.explanation.detailed_supporting_factors
      : [],
    research_disclaimer: prediction.research_disclaimer || null,
  };

  const { data: storedRecord, error: insertError } = await supabase
    .from("campaign_viability_assessments")
    .insert(assessmentRecord)
    .select()
    .single();

  if (insertError) {
    throw new Error(`Failed to persist assessment in Supabase: ${insertError.message}`);
  }

  return storedRecord;
}

/**
 * Server-side orchestrator that executes the full viability assessment lifecycle:
 * 1. Fetches campaign data & constructs 48-hour boundary-compliant feature payload
 * 2. Executes ML inference through FastAPI /predict/viability
 * 3. Persists the assessment result in Supabase campaign_viability_assessments table
 * 4. Returns the stored assessment ID and prediction output
 *
 * @param {string} campaignId - Unique UUID or ID of the campaign/charity.
 * @param {Object} [options] - Optional configuration overrides.
 * @param {Object} [options.supabaseClient] - Optional authenticated Supabase server client.
 * @param {number} [options.targetGoal=10000.0] - Target goal amount (must be > 0).
 * @param {string} [options.country="US"] - Default country code if omitted from campaign record.
 * @returns {Promise<Object>} Object containing assessment_id, stored_at, and prediction payload.
 * @throws {Error} If payload construction, ML prediction, or database persistence fails.
 */
export async function assessCampaignViability(campaignId, options = {}) {
  if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
    throw new Error("Valid campaignId is required for viability assessment.");
  }

  const cleanCampaignId = campaignId.trim();

  // 1. Build 48-hour temporal payload from campaign data
  const payload = await buildCampaignViabilityPayload(cleanCampaignId, options);

  // 2. Delegate to server-side FastAPI client
  const prediction = await predictCampaignViability(payload);

  // 3. Persist valid prediction into Supabase
  const storedRecord = await storeViabilityAssessment(
    cleanCampaignId,
    prediction,
    options
  );

  // 4. Return stored assessment ID and prediction payload
  return {
    success: true,
    assessment_id: storedRecord?.id || null,
    stored_at: storedRecord?.created_at || new Date().toISOString(),
    prediction,
  };
}
