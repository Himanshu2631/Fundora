/**
 * Phase 4.4 Step 1: Admin Viability Assessment Data-Access Layer Tests
 *
 * Test coverage:
 * TEST 1 — Authorized admin (assessment list accessible)
 * TEST 2 — Authorized admin requests one assessment (correct assessment returned)
 * TEST 3 — Non-admin user (access denied with 403)
 * TEST 4 — Unauthenticated request (access denied with 401)
 * TEST 5 — Missing assessment (controlled not-found result)
 * TEST 6 — Pagination & filtering (range pagination, pageSize limits, riskLevel filter)
 * TEST 7 — Existing assessment data consistency & privacy (no donor/payment data leaked)
 *
 * Run with: node scratch/test_admin_assessment_service.js
 */

import {
  verifyAdminUser,
  getCampaignViabilityAssessments,
  getCampaignViabilityAssessmentById,
} from "../lib/ml/adminAssessmentService.js";

// ============================================================
// IN-MEMORY MOCK SUPABASE CLIENT BUILDER
// ============================================================

function createMockSupabaseClient({
  currentUser = null,
  profileRole = "user",
  assessments = [],
  charities = [],
} = {}) {
  const store = {
    assessments: JSON.parse(JSON.stringify(assessments)),
    charities: JSON.parse(JSON.stringify(charities)),
  };

  return {
    auth: {
      getUser: async () => ({
        data: { user: currentUser },
        error: null,
      }),
    },
    from: (table) => {
      const makeChain = (data) => {
        let currentData = [...data];
        let rangeApplied = false;

        const chain = {
          select: (fields, options) => {
            return chain;
          },
          eq: (field, value) => {
            currentData = currentData.filter((item) => item[field] === value);
            return chain;
          },
          in: (field, values) => {
            currentData = currentData.filter((item) => values.includes(item[field]));
            return chain;
          },
          order: (sortField, sortOptions) => {
            const ascending = sortOptions?.ascending !== false;
            currentData.sort((a, b) => {
              if (sortField === "created_at") {
                return ascending
                  ? new Date(a[sortField]) - new Date(b[sortField])
                  : new Date(b[sortField]) - new Date(a[sortField]);
              }
              if (a[sortField] < b[sortField]) return ascending ? -1 : 1;
              if (a[sortField] > b[sortField]) return ascending ? 1 : -1;
              return 0;
            });
            return chain;
          },
          range: (from, to) => {
            rangeApplied = true;
            const sliced = currentData.slice(from, to + 1);
            const totalCount = currentData.length;
            const chainWithRange = makeChain(sliced);
            // Override then to return sliced data along with full count
            chainWithRange.then = async (resolve) =>
              resolve({ data: sliced, count: totalCount, error: null });
            return chainWithRange;
          },
          limit: (limitVal) => {
            currentData = currentData.slice(0, limitVal);
            return chain;
          },
          maybeSingle: async () => ({
            data: currentData[0] || null,
            error: null,
          }),
          single: async () => ({
            data: currentData[0] || null,
            error: currentData[0] ? null : { message: "Row not found" },
          }),
          then: async (resolve) =>
            resolve({
              data: currentData,
              count: currentData.length,
              error: null,
            }),
        };
        return chain;
      };

      if (table === "profiles") {
        const profileData = currentUser
          ? [
              {
                id: currentUser.id,
                email: currentUser.email,
                role: profileRole,
                full_name: currentUser.user_metadata?.full_name || "Test User",
              },
            ]
          : [];
        return makeChain(profileData);
      }

      if (table === "campaign_viability_assessments") {
        // Hydrate with joined charity if available
        const hydrated = store.assessments.map((a) => {
          const matchedCharity = store.charities.find((c) => c.id === a.campaign_id);
          return {
            ...a,
            charities: matchedCharity || null,
          };
        });
        return makeChain(hydrated);
      }

      if (table === "charities") {
        return makeChain(store.charities);
      }

      return makeChain([]);
    },
  };
}

// ============================================================
// FIXTURE DATA
// ============================================================

const MOCK_CHARITIES = [
  {
    id: "charity-uuid-001",
    name: "Clean Water for All",
    description: "Constructing clean water wells in drought-affected villages.",
    category: "Clean Water",
    image_url: "/water.png",
    created_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "charity-uuid-002",
    name: "Solar Micro-Grids",
    description: "Installing solar grids for remote healthcare centers.",
    category: "Clean Energy",
    image_url: "/solar.png",
    created_at: "2026-09-02T10:00:00Z",
  },
];

const MOCK_ASSESSMENTS = [
  {
    id: "assess-uuid-001",
    campaign_id: "charity-uuid-001",
    viability_score: 82,
    risk_probability: 0.185,
    risk_level: "LOW RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    n_features: 56,
    calibration: "Platt Scaling (Sigmoid)",
    base_rate_risk: 0.4996,
    top_risk_factors: ["Target goal is in top quartile"],
    top_supporting_factors: ["High early donor velocity", "Detailed campaign narrative"],
    detailed_risk_factors: [{ feature: "goal", impact: 0.12 }],
    detailed_supporting_factors: [{ feature: "early_donations_count", impact: 0.35 }],
    research_disclaimer: "Predicted outcome for advisory use.",
    created_at: "2026-09-03T10:00:00Z",
    updated_at: "2026-09-03T10:00:00Z",
  },
  {
    id: "assess-uuid-002",
    campaign_id: "charity-uuid-002",
    viability_score: 41,
    risk_probability: 0.592,
    risk_level: "HIGH RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    n_features: 56,
    calibration: "Platt Scaling (Sigmoid)",
    base_rate_risk: 0.4996,
    top_risk_factors: ["Low early momentum", "Sparse description"],
    top_supporting_factors: ["Category has high baseline"],
    detailed_risk_factors: [{ feature: "donations_48h", impact: 0.28 }],
    detailed_supporting_factors: [{ feature: "category", impact: 0.05 }],
    research_disclaimer: "Predicted outcome for advisory use.",
    created_at: "2026-09-04T12:00:00Z",
    updated_at: "2026-09-04T12:00:00Z",
  },
];

// Generate 15 assessments for pagination testing
const MOCK_PAGINATION_ASSESSMENTS = Array.from({ length: 15 }, (_, i) => ({
  id: `assess-page-${i + 1}`,
  campaign_id: i % 2 === 0 ? "charity-uuid-001" : "charity-uuid-002",
  viability_score: 30 + i * 4,
  risk_probability: 0.7 - i * 0.03,
  risk_level: i < 5 ? "HIGH RISK" : i < 10 ? "MEDIUM RISK" : "LOW RISK",
  assessment_type: "initial_48h",
  prediction_horizon_hours: 48,
  model_name: "Random Forest Champion",
  model_type: "RandomForestClassifier",
  n_features: 56,
  calibration: "Platt Scaling (Sigmoid)",
  base_rate_risk: 0.4996,
  top_risk_factors: ["Factor A"],
  top_supporting_factors: ["Factor B"],
  created_at: new Date(Date.now() - (15 - i) * 3600000).toISOString(),
  updated_at: new Date(Date.now() - (15 - i) * 3600000).toISOString(),
}));

// ============================================================
// TEST SUITE
// ============================================================

async function runAllTests() {
  console.log("\n=======================================================");
  console.log("PHASE 4.4 STEP 1 — DATA-ACCESS LAYER VERIFICATION SUITE");
  console.log("=======================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${message}`);
      failed++;
    }
  }

  const adminUser = { id: "admin-user-001", email: "admin@sahayata.demo" };
  const regularUser = { id: "regular-user-001", email: "donor@example.com" };

  // -------------------------------------------------------------
  // TEST 1 — Authorized Admin: Assessment list accessible
  // -------------------------------------------------------------
  console.log("TEST 1: Authorized admin requests assessment list");
  try {
    const adminClient = createMockSupabaseClient({
      currentUser: adminUser,
      profileRole: "admin",
      assessments: MOCK_ASSESSMENTS,
      charities: MOCK_CHARITIES,
    });

    const result = await getCampaignViabilityAssessments({ supabaseClient: adminClient });

    assert(Array.isArray(result.assessments), "Result contains assessments array");
    assert(result.assessments.length === 2, `Returned 2 assessments (got ${result.assessments.length})`);
    assert(result.pagination && result.pagination.totalCount === 2, "Pagination metadata included");
    assert(result.assessments[0].campaign_title === "Solar Micro-Grids" || result.assessments[0].campaign_title === "Clean Water for All", "Campaign title joined accurately");
    assert(typeof result.assessments[0].viability_score === "number", "Viability score is numeric");
    assert(typeof result.assessments[0].risk_probability === "number", "Risk probability is numeric");
    assert(Boolean(result.assessments[0].risk_level), "Risk level present");
    assert(Boolean(result.assessments[0].created_at), "Assessment timestamp present");
  } catch (err) {
    assert(false, `TEST 1 threw unexpected error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 2 — Authorized Admin: Requests one assessment by ID
  // -------------------------------------------------------------
  console.log("\nTEST 2: Authorized admin requests one assessment by ID");
  try {
    const adminClient = createMockSupabaseClient({
      currentUser: adminUser,
      profileRole: "admin",
      assessments: MOCK_ASSESSMENTS,
      charities: MOCK_CHARITIES,
    });

    const assessment = await getCampaignViabilityAssessmentById("assess-uuid-001", { supabaseClient: adminClient });

    assert(assessment !== null, "Assessment record returned");
    assert(assessment.id === "assess-uuid-001", "Correct assessment ID returned");
    assert(assessment.campaign && assessment.campaign.name === "Clean Water for All", "Campaign information attached");
    assert(assessment.viability_score === 82, "Viability score matches stored record (82)");
    assert(assessment.risk_probability === 0.185, "Risk probability matches stored record (0.185)");
    assert(assessment.risk_level === "LOW RISK", "Risk level matches stored record (LOW RISK)");
    assert(assessment.top_risk_factors.length === 1, "Top risk factors returned");
    assert(assessment.top_supporting_factors.length === 2, "Top supporting factors returned");
    assert(assessment.calibration === "Platt Scaling (Sigmoid)", "Calibration model information returned");
  } catch (err) {
    assert(false, `TEST 2 threw unexpected error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 3 — Non-Admin User: Access denied (403 Forbidden)
  // -------------------------------------------------------------
  console.log("\nTEST 3: Non-admin user access denied");
  try {
    const userClient = createMockSupabaseClient({
      currentUser: regularUser,
      profileRole: "user",
      assessments: MOCK_ASSESSMENTS,
      charities: MOCK_CHARITIES,
    });

    let listError = null;
    try {
      await getCampaignViabilityAssessments({ supabaseClient: userClient });
    } catch (err) {
      listError = err;
    }

    assert(listError !== null, "List query rejected non-admin user");
    assert(listError?.statusCode === 403 || listError?.code === "FORBIDDEN", `Correct 403 Forbidden status code on list (got ${listError?.statusCode})`);

    let detailError = null;
    try {
      await getCampaignViabilityAssessmentById("assess-uuid-001", { supabaseClient: userClient });
    } catch (err) {
      detailError = err;
    }

    assert(detailError !== null, "Detail query rejected non-admin user");
    assert(detailError?.statusCode === 403 || detailError?.code === "FORBIDDEN", `Correct 403 Forbidden status code on detail (got ${detailError?.statusCode})`);
  } catch (err) {
    assert(false, `TEST 3 threw unexpected error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 4 — Unauthenticated Request: Access denied (401 Unauthorized)
  // -------------------------------------------------------------
  console.log("\nTEST 4: Unauthenticated request access denied");
  try {
    const unauthClient = createMockSupabaseClient({
      currentUser: null,
      profileRole: null,
      assessments: MOCK_ASSESSMENTS,
      charities: MOCK_CHARITIES,
    });

    let listError = null;
    try {
      await getCampaignViabilityAssessments({ supabaseClient: unauthClient });
    } catch (err) {
      listError = err;
    }

    assert(listError !== null, "List query rejected unauthenticated request");
    assert(listError?.statusCode === 401 || listError?.code === "UNAUTHORIZED", `Correct 401 Unauthorized code on list (got ${listError?.statusCode})`);

    let detailError = null;
    try {
      await getCampaignViabilityAssessmentById("assess-uuid-001", { supabaseClient: unauthClient });
    } catch (err) {
      detailError = err;
    }

    assert(detailError !== null, "Detail query rejected unauthenticated request");
    assert(detailError?.statusCode === 401 || detailError?.code === "UNAUTHORIZED", `Correct 401 Unauthorized code on detail (got ${detailError?.statusCode})`);
  } catch (err) {
    assert(false, `TEST 4 threw unexpected error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 5 — Missing assessment: Controlled not-found result
  // -------------------------------------------------------------
  console.log("\nTEST 5: Missing assessment controlled not-found result");
  try {
    const adminClient = createMockSupabaseClient({
      currentUser: adminUser,
      profileRole: "admin",
      assessments: MOCK_ASSESSMENTS,
      charities: MOCK_CHARITIES,
    });

    const result = await getCampaignViabilityAssessmentById("non-existent-id-999", { supabaseClient: adminClient });
    assert(result === null, "Returns null cleanly for non-existent assessment ID");

    let invalidIdError = null;
    try {
      await getCampaignViabilityAssessmentById("", { supabaseClient: adminClient });
    } catch (err) {
      invalidIdError = err;
    }
    assert(invalidIdError !== null && invalidIdError.statusCode === 400, "Rejects empty assessment ID with 400 Bad Request");
  } catch (err) {
    assert(false, `TEST 5 threw unexpected error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 6 — Pagination & Filtering
  // -------------------------------------------------------------
  console.log("\nTEST 6: Server-side pagination and filtering");
  try {
    const adminClient = createMockSupabaseClient({
      currentUser: adminUser,
      profileRole: "admin",
      assessments: MOCK_PAGINATION_ASSESSMENTS,
      charities: MOCK_CHARITIES,
    });

    // Page 1 with pageSize = 5
    const page1 = await getCampaignViabilityAssessments({
      page: 1,
      pageSize: 5,
      supabaseClient: adminClient,
    });

    assert(page1.assessments.length === 5, `Page 1 returned exactly 5 records (got ${page1.assessments.length})`);
    assert(page1.pagination.totalCount === 15, `Total count is 15 (got ${page1.pagination.totalCount})`);
    assert(page1.pagination.totalPages === 3, `Total pages is 3 (got ${page1.pagination.totalPages})`);
    assert(page1.pagination.hasNextPage === true, "hasNextPage is true on page 1");
    assert(page1.pagination.hasPreviousPage === false, "hasPreviousPage is false on page 1");

    // Page 2 with pageSize = 5
    const page2 = await getCampaignViabilityAssessments({
      page: 2,
      pageSize: 5,
      supabaseClient: adminClient,
    });

    assert(page2.assessments.length === 5, `Page 2 returned exactly 5 records (got ${page2.assessments.length})`);
    assert(page2.assessments[0].id !== page1.assessments[0].id, "Page 2 contains different records than Page 1");
    assert(page2.pagination.hasNextPage === true, "hasNextPage is true on page 2");
    assert(page2.pagination.hasPreviousPage === true, "hasPreviousPage is true on page 2");

    // Risk level filter: HIGH RISK
    const filteredRisk = await getCampaignViabilityAssessments({
      riskLevel: "HIGH RISK",
      pageSize: 20,
      supabaseClient: adminClient,
    });

    assert(filteredRisk.assessments.every((a) => a.risk_level === "HIGH RISK"), "Risk level filter returned only HIGH RISK assessments");
    assert(filteredRisk.assessments.length === 5, `Found 5 HIGH RISK records (got ${filteredRisk.assessments.length})`);

    // Campaign filter
    const filteredCampaign = await getCampaignViabilityAssessments({
      campaignId: "charity-uuid-001",
      pageSize: 20,
      supabaseClient: adminClient,
    });

    assert(filteredCampaign.assessments.every((a) => a.campaign_id === "charity-uuid-001"), "Campaign filter returned only charity-uuid-001 records");
  } catch (err) {
    assert(false, `TEST 6 threw unexpected error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // TEST 7 — Assessment Data Consistency & Privacy
  // -------------------------------------------------------------
  console.log("\nTEST 7: Data consistency and privacy audit");
  try {
    const adminClient = createMockSupabaseClient({
      currentUser: adminUser,
      profileRole: "admin",
      assessments: MOCK_ASSESSMENTS,
      charities: MOCK_CHARITIES,
    });

    const detail = await getCampaignViabilityAssessmentById("assess-uuid-001", { supabaseClient: adminClient });

    // Verify consistency with stored record
    assert(detail.viability_score === 82, "viability_score matches exact DB value");
    assert(detail.risk_probability === 0.185, "risk_probability matches exact DB value");
    assert(detail.model_name === "Random Forest Champion", "model_name matches exact DB value");
    assert(detail.model_type === "RandomForestClassifier", "model_type matches exact DB value");
    assert(detail.n_features === 56, "n_features matches exact DB value");
    assert(detail.calibration === "Platt Scaling (Sigmoid)", "calibration matches exact DB value");
    assert(detail.base_rate_risk === 0.4996, "base_rate_risk matches exact DB value");

    // Privacy checks
    const detailString = JSON.stringify(detail);
    assert(!detailString.includes("stripe"), "No Stripe/payment tokens exposed in detail response");
    assert(!detailString.includes("user_charity_selections"), "No donor selections table data exposed");
    assert(!detailString.includes("user_id"), "No individual donor user IDs exposed");
    assert(!("raised" in (detail.campaign || {})), "No campaign total raised outcome leakage on campaign object");

    const list = await getCampaignViabilityAssessments({ supabaseClient: adminClient });
    const listString = JSON.stringify(list);
    assert(!listString.includes("stripe"), "No Stripe/payment tokens exposed in list response");
    assert(!listString.includes("user_id"), "No user IDs exposed in list response");
  } catch (err) {
    assert(false, `TEST 7 threw unexpected error: ${err.message}`);
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=======================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runAllTests().catch((err) => {
  console.error("Fatal test runner error:", err);
  process.exit(1);
});
