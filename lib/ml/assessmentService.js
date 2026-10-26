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

  if (prediction.status || options.status) {
    assessmentRecord.status = prediction.status || options.status;
  }
  if (prediction.model?.version || options.model_version) {
    assessmentRecord.model_version = prediction.model?.version || options.model_version;
  }

  let { data: storedRecord, error: insertError } = await supabase
    .from("campaign_viability_assessments")
    .insert(assessmentRecord)
    .select()
    .single();

  // Graceful fallback if status or model_version column is not yet present in schema
  if (insertError && (insertError.message?.includes("status") || insertError.message?.includes("model_version"))) {
    delete assessmentRecord.status;
    delete assessmentRecord.model_version;
    const retry = await supabase
      .from("campaign_viability_assessments")
      .insert(assessmentRecord)
      .select()
      .single();
    storedRecord = retry.data;
    insertError = retry.error;
  }

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

/**
 * Securely retrieves the latest stored campaign viability assessment for a specific campaign.
 * Intended for public and user-facing campaign pages.
 *
 * Guarantees:
 * 1. Server-side only execution.
 * 2. Strictly returns only user-safe viability metrics (never returns donor info, payments, or secrets).
 * 3. Returns null safely if no assessment has been conducted or campaign is under 48 hours.
 * 4. Resolves the latest valid assessment using deterministic created_at DESC ordering.
 * 5. Preserves stored ML values without frontend recalculation.
 *
 * @param {string} campaignId - Unique UUID or ID of the campaign/charity.
 * @param {Object} [options] - Additional options.
 * @param {Object} [options.supabaseClient] - Optional authenticated Supabase server client.
 * @param {Object} [options.cookieStore] - Optional custom cookie store.
 * @returns {Promise<Object|null>} The sanitized viability assessment or null.
 * @throws {Error} If query execution fails.
 */
export async function getCampaignViabilityAssessment(campaignId, options = {}) {
  if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
    return null;
  }

  const cleanCampaignId = campaignId.trim();
  let supabase = options?.supabaseClient || (options && typeof options.from === "function" ? options : null);
  if (!supabase) {
    const { createServer } = await import("../supabase-server.js");
    supabase = await createServer(options?.cookieStore);
  }

  const fullSelectFields = `
    id,
    campaign_id,
    risk_probability,
    viability_score,
    risk_level,
    prediction_horizon_hours,
    model_name,
    model_type,
    n_features,
    calibration,
    base_rate_risk,
    top_risk_factors,
    top_supporting_factors,
    detailed_risk_factors,
    detailed_supporting_factors,
    research_disclaimer,
    assessment_type,
    status,
    model_version,
    created_at
  `;

  const fallbackSelectFields = `
    id,
    campaign_id,
    risk_probability,
    viability_score,
    risk_level,
    prediction_horizon_hours,
    model_name,
    model_type,
    n_features,
    calibration,
    base_rate_risk,
    top_risk_factors,
    top_supporting_factors,
    detailed_risk_factors,
    detailed_supporting_factors,
    research_disclaimer,
    assessment_type,
    created_at
  `;

  let query = supabase
    .from("campaign_viability_assessments")
    .select(fullSelectFields)
    .eq("campaign_id", cleanCampaignId)
    .order("created_at", { ascending: false });

  if (typeof query.order === "function") {
    query = query.order("id", { ascending: false });
  }
  query = query.limit(1);

  let { data, error } = await query;

  if (error && (error.message?.includes("status") || error.message?.includes("model_version"))) {
    let fallbackQuery = supabase
      .from("campaign_viability_assessments")
      .select(fallbackSelectFields)
      .eq("campaign_id", cleanCampaignId)
      .order("created_at", { ascending: false });

    if (typeof fallbackQuery.order === "function") {
      fallbackQuery = fallbackQuery.order("id", { ascending: false });
    }
    const fallbackRes = await fallbackQuery.limit(1);
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    throw new Error(`Failed to retrieve campaign viability assessment: ${error.message}`);
  }

  if (!data || !Array.isArray(data) || data.length === 0) {
    return null;
  }

  const row = data[0];

  return {
    id: row.id,
    campaign_id: row.campaign_id,
    risk_probability: Number(row.risk_probability),
    viability_score: Number(row.viability_score),
    risk_level: row.risk_level,
    prediction_horizon_hours: Number(row.prediction_horizon_hours || 48),
    model_name: row.model_name,
    model_version: row.model_version || row.model_name,
    model_type: row.model_type || "RandomForestClassifier",
    n_features: Number(row.n_features || 56),
    calibration: row.calibration,
    base_rate_risk: Number(row.base_rate_risk ?? 0.4996),
    top_risk_factors: Array.isArray(row.top_risk_factors) ? row.top_risk_factors : [],
    top_supporting_factors: Array.isArray(row.top_supporting_factors) ? row.top_supporting_factors : [],
    research_disclaimer: row.research_disclaimer || null,
    assessment_type: row.assessment_type || "initial_48h",
    status: row.status || "completed",
    created_at: row.created_at,
  };
}

/**
 * Batch retrieves the latest stored campaign viability assessment for multiple campaigns.
 *
 * @param {Array<string>} campaignIds - Array of campaign UUIDs.
 * @param {Object} [options] - Additional options.
 * @param {Object} [options.supabaseClient] - Optional authenticated Supabase server client.
 * @param {Object} [options.cookieStore] - Optional custom cookie store.
 * @returns {Promise<Object>} Map of campaignId -> sanitized viability assessment.
 */
export async function getCampaignsViabilityAssessments(campaignIds, options = {}) {
  if (!Array.isArray(campaignIds) || campaignIds.length === 0) {
    return {};
  }

  const cleanIds = campaignIds
    .filter((id) => typeof id === "string" && id.trim())
    .map((id) => id.trim());

  if (cleanIds.length === 0) {
    return {};
  }

  let supabase = options?.supabaseClient || (options && typeof options.from === "function" ? options : null);
  if (!supabase) {
    const { createServer } = await import("../supabase-server.js");
    supabase = await createServer(options?.cookieStore);
  }

  const fullSelectFields = `
    id,
    campaign_id,
    risk_probability,
    viability_score,
    risk_level,
    prediction_horizon_hours,
    model_name,
    model_type,
    n_features,
    calibration,
    base_rate_risk,
    top_risk_factors,
    top_supporting_factors,
    detailed_risk_factors,
    detailed_supporting_factors,
    research_disclaimer,
    assessment_type,
    status,
    model_version,
    created_at
  `;

  const fallbackSelectFields = `
    id,
    campaign_id,
    risk_probability,
    viability_score,
    risk_level,
    prediction_horizon_hours,
    model_name,
    model_type,
    n_features,
    calibration,
    base_rate_risk,
    top_risk_factors,
    top_supporting_factors,
    detailed_risk_factors,
    detailed_supporting_factors,
    research_disclaimer,
    assessment_type,
    created_at
  `;

  let query = supabase
    .from("campaign_viability_assessments")
    .select(fullSelectFields)
    .in("campaign_id", cleanIds)
    .order("created_at", { ascending: false });

  if (typeof query.order === "function") {
    query = query.order("id", { ascending: false });
  }

  let { data, error } = await query;

  if (error && (error.message?.includes("status") || error.message?.includes("model_version"))) {
    let fallbackQuery = supabase
      .from("campaign_viability_assessments")
      .select(fallbackSelectFields)
      .in("campaign_id", cleanIds)
      .order("created_at", { ascending: false });

    if (typeof fallbackQuery.order === "function") {
      fallbackQuery = fallbackQuery.order("id", { ascending: false });
    }
    const fallbackRes = await fallbackQuery;
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    throw new Error(`Failed to retrieve campaign viability assessments: ${error.message}`);
  }

  const map = {};
  if (Array.isArray(data)) {
    for (const row of data) {
      if (!map[row.campaign_id]) {
        map[row.campaign_id] = {
          id: row.id,
          campaign_id: row.campaign_id,
          risk_probability: Number(row.risk_probability),
          viability_score: Number(row.viability_score),
          risk_level: row.risk_level,
          prediction_horizon_hours: Number(row.prediction_horizon_hours || 48),
          model_name: row.model_name,
          model_version: row.model_version || row.model_name,
          model_type: row.model_type || "RandomForestClassifier",
          n_features: Number(row.n_features || 56),
          calibration: row.calibration,
          base_rate_risk: Number(row.base_rate_risk ?? 0.4996),
          top_risk_factors: Array.isArray(row.top_risk_factors) ? row.top_risk_factors : [],
          top_supporting_factors: Array.isArray(row.top_supporting_factors) ? row.top_supporting_factors : [],
          research_disclaimer: row.research_disclaimer || null,
          assessment_type: row.assessment_type || "initial_48h",
          status: row.status || "completed",
          created_at: row.created_at,
        };
      }
    }
  }

  return map;
}

/**
 * Retrieves the full chronological assessment history for a specific campaign.
 * Preserves the immutability of all past assessments.
 *
 * @param {string} campaignId - Unique UUID or ID of the campaign/charity.
 * @param {Object} [options] - Query options.
 * @param {string} [options.sortOrder="desc"] - Sort direction ('desc' or 'asc').
 * @param {number} [options.limit=50] - Maximum number of records to retrieve.
 * @param {Object} [options.supabaseClient] - Optional authenticated Supabase server client.
 * @param {Object} [options.cookieStore] - Optional custom cookie store.
 * @returns {Promise<Array<Object>>} Array of historical viability assessment records.
 * @throws {Error} If query execution fails.
 */
export async function getCampaignViabilityAssessmentHistory(campaignId, options = {}) {
  if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
    return [];
  }

  const cleanCampaignId = campaignId.trim();
  const sortOrder = options?.sortOrder === "asc" ? "asc" : "desc";
  const ascending = sortOrder === "asc";
  const limit = Math.min(100, Math.max(1, parseInt(options?.limit, 10) || 50));

  let supabase = options?.supabaseClient || (options && typeof options.from === "function" ? options : null);
  if (!supabase) {
    const { createServer } = await import("../supabase-server.js");
    supabase = await createServer(options?.cookieStore);
  }

  const fullSelectFields = `
    id,
    campaign_id,
    risk_probability,
    viability_score,
    risk_level,
    prediction_horizon_hours,
    model_name,
    model_type,
    n_features,
    calibration,
    base_rate_risk,
    top_risk_factors,
    top_supporting_factors,
    detailed_risk_factors,
    detailed_supporting_factors,
    research_disclaimer,
    assessment_type,
    status,
    model_version,
    created_at
  `;

  const fallbackSelectFields = `
    id,
    campaign_id,
    risk_probability,
    viability_score,
    risk_level,
    prediction_horizon_hours,
    model_name,
    model_type,
    n_features,
    calibration,
    base_rate_risk,
    top_risk_factors,
    top_supporting_factors,
    detailed_risk_factors,
    detailed_supporting_factors,
    research_disclaimer,
    assessment_type,
    created_at
  `;

  let query = supabase
    .from("campaign_viability_assessments")
    .select(fullSelectFields)
    .eq("campaign_id", cleanCampaignId)
    .order("created_at", { ascending });

  if (typeof query.order === "function") {
    query = query.order("id", { ascending });
  }
  query = query.limit(limit);

  let { data, error } = await query;

  if (error && (error.message?.includes("status") || error.message?.includes("model_version"))) {
    let fallbackQuery = supabase
      .from("campaign_viability_assessments")
      .select(fallbackSelectFields)
      .eq("campaign_id", cleanCampaignId)
      .order("created_at", { ascending });

    if (typeof fallbackQuery.order === "function") {
      fallbackQuery = fallbackQuery.order("id", { ascending });
    }
    const fallbackRes = await fallbackQuery.limit(limit);
    data = fallbackRes.data;
    error = fallbackRes.error;
  }

  if (error) {
    throw new Error(`Failed to retrieve campaign assessment history: ${error.message}`);
  }

  if (!data || !Array.isArray(data)) {
    return [];
  }

  return data.map((row) => ({
    id: row.id,
    campaign_id: row.campaign_id,
    risk_probability: Number(row.risk_probability),
    viability_score: Number(row.viability_score),
    risk_level: row.risk_level,
    prediction_horizon_hours: Number(row.prediction_horizon_hours || 48),
    model_name: row.model_name,
    model_version: row.model_version || row.model_name,
    model_type: row.model_type || "RandomForestClassifier",
    n_features: Number(row.n_features || 56),
    calibration: row.calibration,
    base_rate_risk: Number(row.base_rate_risk ?? 0.4996),
    top_risk_factors: Array.isArray(row.top_risk_factors) ? row.top_risk_factors : [],
    top_supporting_factors: Array.isArray(row.top_supporting_factors) ? row.top_supporting_factors : [],
    detailed_risk_factors: Array.isArray(row.detailed_risk_factors) ? row.detailed_risk_factors : [],
    detailed_supporting_factors: Array.isArray(row.detailed_supporting_factors) ? row.detailed_supporting_factors : [],
    research_disclaimer: row.research_disclaimer || null,
    assessment_type: row.assessment_type || "initial_48h",
    status: row.status || "completed",
    created_at: row.created_at,
  }));
}

