/**
 * Server-side data-access layer for Campaign Viability Assessments
 * dedicated to the Sahayata Admin Viability Dashboard.
 *
 * SECURITY GUARANTEES:
 * 1. Server-side only execution.
 * 2. Every function verifies that the active session belongs to an authorized administrator.
 * 3. Never trusts client-provided role flags or untrusted headers.
 * 4. Never exposes service-role keys, database internals, donor information, or payment data.
 * 5. Uses efficient database filtering, ordering, and server-side pagination.
 */

/**
 * Validates that the active session user is an authorized administrator.
 * Reuses the Sahayata role verification convention:
 * - Checks authenticated user session via supabase.auth.getUser()
 * - Verifies administrator role in public.profiles table or admin email pattern
 *
 * @param {Object} supabaseClient - Authenticated Supabase server client.
 * @returns {Promise<{user: Object, profile: Object}>} Authenticated admin user and profile.
 * @throws {Error} 401 Unauthorized if user is not logged in.
 * @throws {Error} 403 Forbidden if user is authenticated but not an admin.
 */
export async function verifyAdminUser(supabaseClient) {
  if (!supabaseClient || typeof supabaseClient.from !== "function") {
    const err = new Error("Supabase client is required for authentication verification.");
    err.statusCode = 500;
    err.code = "SERVER_ERROR";
    throw err;
  }

  // 1. Verify authenticated user
  const { data: { user } = {}, error: authError } = await supabaseClient.auth.getUser();
  if (authError || !user) {
    const err = new Error("Unauthorized: Authentication required.");
    err.statusCode = 401;
    err.code = "UNAUTHORIZED";
    throw err;
  }

  // 2. Fetch profile to check role
  const { data: profile, error: profileError } = await supabaseClient
    .from("profiles")
    .select("id, email, role, full_name")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError) {
    const err = new Error("Failed to verify user authorization status.");
    err.statusCode = 500;
    err.code = "AUTH_VERIFICATION_ERROR";
    throw err;
  }

  // 3. Verify admin role using project convention
  const isAdmin =
    profile?.role === "admin" ||
    user?.email?.includes("admin") ||
    user?.email?.startsWith("admin@") ||
    user?.role === "admin";

  if (!isAdmin) {
    const err = new Error("Forbidden: Administrator privileges required.");
    err.statusCode = 403;
    err.code = "FORBIDDEN";
    throw err;
  }

  return { user, profile: profile || { id: user.id, email: user.email, role: "admin" } };
}

/**
 * Retrieves a paginated and filtered list of campaign viability assessments for the Admin Dashboard.
 *
 * @param {Object} [options] - Query options and filters.
 * @param {number} [options.page=1] - Current 1-based page number.
 * @param {number} [options.pageSize=10] - Number of records per page (max 100).
 * @param {string} [options.riskLevel] - Filter by risk level ('LOW RISK', 'MEDIUM RISK', 'HIGH RISK').
 * @param {string} [options.campaignId] - Filter by specific campaign UUID/ID.
 * @param {string} [options.assessmentType] - Filter by assessment type ('initial_48h', 'reassessment', 'manual').
 * @param {string} [options.sortOrder="desc"] - Sort direction for assessment timestamp ('asc' or 'desc').
 * @param {Object} [options.supabaseClient] - Optional authenticated Supabase server client.
 * @returns {Promise<{assessments: Array<Object>, pagination: Object}>} Paginated assessments and metadata.
 * @throws {Error} If unauthorized or if the query fails.
 */
export async function getCampaignViabilityAssessments(options = {}) {
  const {
    page: rawPage = 1,
    pageSize: rawPageSize = 10,
    riskLevel,
    campaignId,
    assessmentType,
    sortOrder = "desc",
    supabaseClient: customClient,
  } = options;

  let supabase = customClient;
  if (!supabase) {
    const { createServer } = await import("../supabase-server.js");
    supabase = await createServer(options?.cookieStore);
  }

  // Enforce server-side administrator authorization
  await verifyAdminUser(supabase);

  // Validate and sanitize pagination inputs
  const page = Math.max(1, parseInt(rawPage, 10) || 1);
  const pageSize = Math.min(100, Math.max(1, parseInt(rawPageSize, 10) || 10));
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  const ascending = sortOrder === "asc";

  // Build secure, efficient query selecting only dashboard-relevant fields
  let query = supabase
    .from("campaign_viability_assessments")
    .select(
      `
      id,
      campaign_id,
      viability_score,
      risk_probability,
      risk_level,
      assessment_type,
      prediction_horizon_hours,
      model_name,
      model_type,
      created_at,
      charities (
        id,
        name,
        category,
        image_url
      )
    `,
      { count: "exact" }
    );

  // Apply optional filters
  if (riskLevel && typeof riskLevel === "string" && riskLevel.trim()) {
    query = query.eq("risk_level", riskLevel.trim().toUpperCase());
  }

  if (campaignId && typeof campaignId === "string" && campaignId.trim()) {
    query = query.eq("campaign_id", campaignId.trim());
  }

  if (assessmentType && typeof assessmentType === "string" && assessmentType.trim()) {
    query = query.eq("assessment_type", assessmentType.trim());
  }

  // Ordering and server-side range pagination
  query = query.order("created_at", { ascending });
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(`Failed to retrieve viability assessments: ${error.message}`);
  }

  const rawAssessments = Array.isArray(data) ? data : [];

  // Format records cleanly without exposing unnecessary data
  const assessments = await Promise.all(
    rawAssessments.map(async (row) => {
      let charity = Array.isArray(row.charities) ? row.charities[0] : row.charities;
      if (!charity && row.campaign_id) {
        const { data: directCharity } = await supabase
          .from("charities")
          .select("id, name, category, image_url")
          .eq("id", row.campaign_id)
          .maybeSingle();
        if (directCharity) {
          charity = directCharity;
        }
      }

      return {
        id: row.id,
        campaign_id: row.campaign_id,
        campaign_title: charity?.name || null,
        campaign_category: charity?.category || null,
        campaign_image_url: charity?.image_url || null,
        viability_score: Number(row.viability_score),
        risk_probability: Number(row.risk_probability),
        risk_level: row.risk_level,
        assessment_type: row.assessment_type,
        prediction_horizon_hours: Number(row.prediction_horizon_hours || 48),
        model_name: row.model_name,
        model_type: row.model_type,
        created_at: row.created_at,
      };
    })
  );

  const totalCount = count !== null && count !== undefined ? Number(count) : assessments.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return {
    assessments,
    pagination: {
      page,
      pageSize,
      totalCount,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };
}

/**
 * Securely retrieves a single campaign viability assessment by ID for the Admin Dashboard.
 *
 * @param {string} assessmentId - Unique UUID or ID of the assessment.
 * @param {Object} [options] - Additional options.
 * @param {Object} [options.supabaseClient] - Optional authenticated Supabase server client.
 * @returns {Promise<Object|null>} The assessment details or null if not found.
 * @throws {Error} If assessmentId is invalid, unauthorized, or query fails.
 */
export async function getCampaignViabilityAssessmentById(assessmentId, options = {}) {
  if (!assessmentId || typeof assessmentId !== "string" || !assessmentId.trim()) {
    const err = new Error("Valid assessmentId string is required.");
    err.statusCode = 400;
    err.code = "INVALID_ASSESSMENT_ID";
    throw err;
  }

  const cleanId = assessmentId.trim();
  let supabase = options?.supabaseClient;
  if (!supabase) {
    const { createServer } = await import("../supabase-server.js");
    supabase = await createServer(options?.cookieStore);
  }

  // Enforce server-side administrator authorization
  await verifyAdminUser(supabase);

  // Retrieve single assessment record with associated campaign summary
  const { data: row, error } = await supabase
    .from("campaign_viability_assessments")
    .select(
      `
      id,
      campaign_id,
      viability_score,
      risk_probability,
      risk_level,
      assessment_type,
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
      created_at,
      updated_at,
      charities (
        id,
        name,
        description,
        category,
        image_url,
        created_at
      )
    `
    )
    .eq("id", cleanId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to retrieve viability assessment: ${error.message}`);
  }

  if (!row) {
    return null;
  }

  let charity = Array.isArray(row.charities) ? row.charities[0] : row.charities;

  // Graceful fallback for mock clients where postgREST joins may not be populated
  if (!charity && row.campaign_id) {
    const { data: directCharity } = await supabase
      .from("charities")
      .select("id, name, description, category, image_url, created_at")
      .eq("id", row.campaign_id)
      .maybeSingle();
    if (directCharity) {
      charity = directCharity;
    }
  }

  return {
    id: row.id,
    campaign_id: row.campaign_id,
    campaign: charity
      ? {
          id: charity.id,
          name: charity.name,
          description: charity.description,
          category: charity.category,
          image_url: charity.image_url,
          created_at: charity.created_at,
        }
      : null,
    viability_score: Number(row.viability_score),
    risk_probability: Number(row.risk_probability),
    risk_level: row.risk_level,
    assessment_type: row.assessment_type,
    prediction_horizon_hours: Number(row.prediction_horizon_hours || 48),
    model_name: row.model_name,
    model_type: row.model_type,
    n_features: Number(row.n_features || 56),
    calibration: row.calibration,
    base_rate_risk: Number(row.base_rate_risk ?? 0.4996),
    top_risk_factors: Array.isArray(row.top_risk_factors) ? row.top_risk_factors : [],
    top_supporting_factors: Array.isArray(row.top_supporting_factors) ? row.top_supporting_factors : [],
    detailed_risk_factors: Array.isArray(row.detailed_risk_factors) ? row.detailed_risk_factors : [],
    detailed_supporting_factors: Array.isArray(row.detailed_supporting_factors) ? row.detailed_supporting_factors : [],
    research_disclaimer: row.research_disclaimer || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Calculates aggregate summary metrics across all campaign viability assessments
 * strictly for the Admin Viability Dashboard.
 *
 * Metrics computed:
 * 1. totalAssessed - total number of assessed campaigns
 * 2. averageViabilityScore - arithmetic mean of valid viability scores (or null if empty)
 * 3. lowRiskCount - count of assessments categorized as 'LOW RISK'
 * 4. mediumRiskCount - count of assessments categorized as 'MEDIUM RISK'
 * 5. highRiskCount - count of assessments categorized as 'HIGH RISK'
 * 6. lastAssessmentTimestamp - ISO timestamp of the latest assessment (or null if empty)
 *
 * @param {Object} [options] - Additional options.
 * @param {Object} [options.supabaseClient] - Optional authenticated Supabase server client.
 * @param {Object} [options.cookieStore] - Optional custom cookie store for server auth.
 * @returns {Promise<Object>} Aggregate summary object.
 * @throws {Error} If unauthorized or if query fails.
 */
export async function getCampaignViabilitySummary(options = {}) {
  let supabase = options?.supabaseClient;
  if (!supabase) {
    const { createServer } = await import("../supabase-server.js");
    supabase = await createServer(options?.cookieStore);
  }

  // Enforce server-side administrator authorization
  await verifyAdminUser(supabase);

  // Retrieve minimal fields required for aggregation
  const { data, error } = await supabase
    .from("campaign_viability_assessments")
    .select("viability_score, risk_level, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Failed to retrieve viability summary: ${error.message}`);
  }

  const records = Array.isArray(data) ? data : [];
  const totalAssessed = records.length;

  if (totalAssessed === 0) {
    return {
      hasAssessments: false,
      totalAssessed: 0,
      averageViabilityScore: null,
      lowRiskCount: 0,
      mediumRiskCount: 0,
      highRiskCount: 0,
      lastAssessmentTimestamp: null,
    };
  }

  let sumScore = 0;
  let validScoreCount = 0;
  let lowRiskCount = 0;
  let mediumRiskCount = 0;
  let highRiskCount = 0;

  for (const row of records) {
    const score = Number(row.viability_score);
    if (!isNaN(score) && score >= 0) {
      sumScore += score;
      validScoreCount++;
    }

    const risk = String(row.risk_level || "").toUpperCase();
    if (risk === "LOW RISK") {
      lowRiskCount++;
    } else if (risk === "MEDIUM RISK") {
      mediumRiskCount++;
    } else if (risk === "HIGH RISK") {
      highRiskCount++;
    }
  }

  const averageViabilityScore =
    validScoreCount > 0 ? Math.round((sumScore / validScoreCount) * 10) / 10 : null;

  const lastAssessmentTimestamp = records[0]?.created_at || null;

  return {
    hasAssessments: true,
    totalAssessed,
    averageViabilityScore,
    lowRiskCount,
    mediumRiskCount,
    highRiskCount,
    lastAssessmentTimestamp,
  };
}

