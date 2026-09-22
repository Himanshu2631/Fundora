/**
 * Phase 4.4 Step 6: Complete End-to-End Verification Suite for Admin Viability Dashboard
 *
 * Tests:
 * Test A — Admin Access & Authorization Flow
 * Test B — Viability Summary Aggregations vs Records
 * Test C — Assessment Table (Search, Filter, Sort, Pagination)
 * Test D — Assessment Detail Data Integrity & Fidelity
 * Test E — SHAP / Model Explanation Non-Causality & Non-Fabrication
 * Test F — Unauthenticated Access Protection (401)
 * Test G — Non-Admin Access Protection (403)
 * Test H — Invalid / Missing Assessment ID (400/404 Clean Handlers)
 * Test I — Empty State Handling (No Fake Data)
 * Test J — Database / API Failure Graceful Degradation
 * Test K — Security & Privacy Audit (No Stripe, PII, ML_API_URL, Service-Role Keys)
 * Test L — Data Consistency Tracing (DB -> API -> Summary/Table -> Detail)
 *
 * Run with: node scratch/test_phase4_4_e2e.js
 */

import {
  verifyAdminUser,
  getCampaignViabilityAssessments,
  getCampaignViabilityAssessmentById,
  getCampaignViabilitySummary,
} from "../lib/ml/adminAssessmentService.js";
import { GET as listRoute } from "../app/api/admin/assessments/route.js";
import { GET as detailRoute } from "../app/api/admin/assessments/[id]/route.js";
import { GET as summaryRoute } from "../app/api/admin/assessments/summary/route.js";

// ============================================================
// FIXTURE DATA
// ============================================================

const SEED_CHARITIES = [
  {
    id: "charity-e2e-001",
    name: "Clean Water Project",
    description: "Providing clean drinking water in drylands.",
    category: "Clean Water",
    image_url: "/water.jpg",
    created_at: "2026-09-01T08:00:00Z",
  },
  {
    id: "charity-e2e-002",
    name: "Solar Schools Initiative",
    description: "Solar installations for rural schools.",
    category: "Education",
    image_url: "/solar.jpg",
    created_at: "2026-09-02T08:00:00Z",
  },
  {
    id: "charity-e2e-003",
    name: "Mobile Health Clinics",
    description: "Providing healthcare in isolated areas.",
    category: "Health",
    image_url: "/health.jpg",
    created_at: "2026-09-03T08:00:00Z",
  },
];

const SEED_ASSESSMENTS = [
  {
    id: "e2e-assess-001",
    campaign_id: "charity-e2e-001",
    viability_score: 84,
    risk_probability: 0.162,
    risk_level: "LOW RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    n_features: 56,
    calibration: "Platt Scaling (Sigmoid)",
    base_rate_risk: 0.4996,
    top_risk_factors: ["Target goal is in upper quartile"],
    top_supporting_factors: ["Early donor velocity in top decile", "Extensive narrative length"],
    detailed_risk_factors: [{ feature: "goal", impact: 0.14 }],
    detailed_supporting_factors: [{ feature: "early_velocity", impact: 0.42 }],
    research_disclaimer: "Advisory viability score for platform moderation.",
    created_at: "2026-09-10T10:00:00Z",
    updated_at: "2026-09-10T10:00:00Z",
  },
  {
    id: "e2e-assess-002",
    campaign_id: "charity-e2e-002",
    viability_score: 52,
    risk_probability: 0.481,
    risk_level: "MEDIUM RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    n_features: 56,
    calibration: "Platt Scaling (Sigmoid)",
    base_rate_risk: 0.4996,
    top_risk_factors: ["Moderate early contribution count"],
    top_supporting_factors: ["Verified charity status"],
    detailed_risk_factors: [{ feature: "contributions_count", impact: 0.28 }],
    detailed_supporting_factors: [{ feature: "verified_charity", impact: 0.18 }],
    research_disclaimer: "Advisory viability score for platform moderation.",
    created_at: "2026-09-12T12:00:00Z",
    updated_at: "2026-09-12T12:00:00Z",
  },
  {
    id: "e2e-assess-003",
    campaign_id: "charity-e2e-003",
    viability_score: 22,
    risk_probability: 0.784,
    risk_level: "HIGH RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    n_features: 56,
    calibration: "Platt Scaling (Sigmoid)",
    base_rate_risk: 0.4996,
    top_risk_factors: ["Low early donation activity", "High funding target"],
    top_supporting_factors: [],
    detailed_risk_factors: [{ feature: "early_donations", impact: 0.45 }],
    detailed_supporting_factors: [],
    research_disclaimer: "Advisory viability score for platform moderation.",
    created_at: "2026-09-15T15:00:00Z",
    updated_at: "2026-09-15T15:00:00Z",
  },
];

// Helper to create mock authenticated client
function createE2EMockSupabase({
  userRole = "admin",
  userId = "admin-user-001",
  assessments = SEED_ASSESSMENTS,
  charities = SEED_CHARITIES,
  failDatabase = false,
} = {}) {
  const user = userId
    ? { id: userId, email: userRole === "admin" ? "admin@fundora.org" : "user@example.com" }
    : null;

  return {
    auth: {
      getUser: async () => {
        if (failDatabase) throw new Error("Database connection timeout");
        return {
          data: { user },
          error: user ? null : { message: "No active session" },
        };
      },
    },
    from: (table) => {
      if (failDatabase) {
        throw new Error("Supabase connection refused");
      }

      let selectedFields = "*";
      let filterField = null;
      let filterVal = null;
      let rangeFrom = 0;
      let rangeTo = 100;
      let sortAsc = false;
      let sortField = "created_at";

      const chain = {
        select: (fields = "*") => {
          selectedFields = fields;
          return chain;
        },
        eq: (field, val) => {
          filterField = field;
          filterVal = val;
          return chain;
        },
        order: (field, { ascending } = {}) => {
          sortField = field;
          sortAsc = !!ascending;
          return chain;
        },
        range: (from, to) => {
          rangeFrom = from;
          rangeTo = to;
          return chain;
        },
        maybeSingle: async () => {
          if (table === "profiles") {
            if (!user) return { data: null, error: null };
            return {
              data: { id: user.id, role: userRole, email: user.email },
              error: null,
            };
          }

          if (table === "campaign_viability_assessments") {
            const found = assessments.find((a) => a[filterField] === filterVal);
            if (!found) return { data: null, error: null };

            const charity = charities.find((c) => c.id === found.campaign_id);
            return {
              data: {
                ...found,
                charities: charity || null,
              },
              error: null,
            };
          }

          if (table === "charities") {
            const charity = charities.find((c) => c[filterField] === filterVal);
            return { data: charity || null, error: null };
          }

          return { data: null, error: null };
        },
        then: (resolve, reject) => {
          if (table === "campaign_viability_assessments") {
            let filtered = [...assessments];
            if (filterField && filterVal !== undefined) {
              filtered = filtered.filter((a) => a[filterField] === filterVal);
            }

            filtered.sort((a, b) => {
              const aVal = a[sortField] || "";
              const bVal = b[sortField] || "";
              return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            });

            const sliced = filtered.slice(rangeFrom, rangeTo + 1).map((item) => {
              const charity = charities.find((c) => c.id === item.campaign_id);
              return {
                ...item,
                charities: charity || null,
              };
            });

            resolve({
              data: sliced,
              count: filtered.length,
              error: null,
            });
          } else {
            resolve({ data: [], count: 0, error: null });
          }
        },
      };

      return chain;
    },
  };
}

// ============================================================
// E2E TEST RUNNER
// ============================================================

async function runEndToEndVerification() {
  console.log("===============================================================");
  console.log("PHASE 4.4 STEP 6 — END-TO-END ADMIN VIABILITY VERIFICATION");
  console.log("===============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAILED] ${message}`);
      failed++;
    }
  }

  // ------------------------------------------------------------
  // 1. TEST A — Admin Access & Authorization Flow
  // ------------------------------------------------------------
  console.log("TEST A: Admin Access & Authorization Flow");
  {
    const adminClient = createE2EMockSupabase({ userRole: "admin" });
    const authResult = await verifyAdminUser(adminClient);
    assert(authResult.profile.role === "admin", "Admin user verified successfully with role='admin'");
    assert(authResult.user.email === "admin@fundora.org", "Admin email pattern confirmed");
  }

  // ------------------------------------------------------------
  // 2. TEST B — Viability Summary Aggregations vs Records
  // ------------------------------------------------------------
  console.log("\nTEST B: Viability Summary Aggregations vs Stored Records");
  {
    const adminClient = createE2EMockSupabase({ userRole: "admin" });
    const summary = await getCampaignViabilitySummary({ supabaseClient: adminClient });

    assert(summary.totalAssessed === 3, "Total assessed count matches 3");
    // Expected average score = (84 + 52 + 22) / 3 = 158 / 3 = 52.67
    assert(Math.abs(summary.averageViabilityScore - 52.67) < 0.1, "Average viability score calculated accurately (52.67)");
    assert(summary.lowRiskCount === 1, "Low risk count = 1");
    assert(summary.mediumRiskCount === 1, "Medium risk count = 1");
    assert(summary.highRiskCount === 1, "High risk count = 1");
    assert(summary.lastAssessmentTimestamp === "2026-09-15T15:00:00Z", "Latest assessment timestamp matched (2026-09-15T15:00:00Z)");
  }

  // ------------------------------------------------------------
  // 3. TEST C — Assessment Table (Search, Filter, Sort, Pagination)
  // ------------------------------------------------------------
  console.log("\nTEST C: Assessment Table (List, Search, Filter, Sort, Pagination)");
  {
    const adminClient = createE2EMockSupabase({ userRole: "admin" });

    // C1: Normal list & pagination
    const listResult = await getCampaignViabilityAssessments({
      page: 1,
      pageSize: 2,
      supabaseClient: adminClient,
    });
    assert(listResult.assessments.length === 2, "Page 1 returned 2 items");
    assert(listResult.pagination.totalCount === 3, "Total count is 3");
    assert(listResult.pagination.totalPages === 2, "Total pages is 2");
    assert(listResult.pagination.hasNextPage === true, "hasNextPage is true");

    // C2: Filtering by Risk Level
    const highRiskResult = await getCampaignViabilityAssessments({
      riskLevel: "HIGH RISK",
      supabaseClient: adminClient,
    });
    assert(highRiskResult.assessments.length === 1, "Risk filter returned 1 HIGH RISK assessment");
    assert(highRiskResult.assessments[0].risk_level === "HIGH RISK", "Filtered item is HIGH RISK");

    // C3: Campaign ID Search
    const searchResult = await getCampaignViabilityAssessments({
      campaignId: "charity-e2e-001",
      supabaseClient: adminClient,
    });
    assert(searchResult.assessments.length === 1, "Search returned matching campaign");
    assert(searchResult.assessments[0].campaign_title === "Clean Water Project", "Campaign title matched");

    // C4: Sorting Order
    const ascResult = await getCampaignViabilityAssessments({
      sortOrder: "asc",
      supabaseClient: adminClient,
    });
    assert(ascResult.assessments[0].created_at === "2026-09-10T10:00:00Z", "Ascending sort puts earliest first");
  }

  // ------------------------------------------------------------
  // 4. TEST D — Assessment Detail Data Integrity & Fidelity
  // ------------------------------------------------------------
  console.log("\nTEST D: Assessment Detail Data Integrity & Fidelity");
  {
    const adminClient = createE2EMockSupabase({ userRole: "admin" });
    const detail = await getCampaignViabilityAssessmentById("e2e-assess-001", {
      supabaseClient: adminClient,
    });

    assert(detail !== null, "Assessment detail retrieved");
    assert(detail.viability_score === 84, "Viability score matches exact stored value (84)");
    assert(detail.risk_probability === 0.162, "Risk probability matches exact stored value (0.162)");
    assert(detail.risk_level === "LOW RISK", "Risk level matches exact stored value ('LOW RISK')");
    assert(detail.prediction_horizon_hours === 48, "Prediction horizon is 48 hours");
    assert(detail.campaign?.name === "Clean Water Project", "Campaign name joined accurately");
    assert(detail.campaign?.category === "Clean Water", "Campaign category joined accurately");
    assert(detail.model_name === "Random Forest Champion", "Model name is preserved");
    assert(detail.model_type === "RandomForestClassifier", "Model type is preserved");
    assert(detail.n_features === 56, "Feature count is preserved (56)");
    assert(detail.calibration === "Platt Scaling (Sigmoid)", "Calibration method is preserved");
    assert(detail.base_rate_risk === 0.4996, "Base-rate risk is preserved (0.4996)");
  }

  // ------------------------------------------------------------
  // 5. TEST E — SHAP / Model Explanation Non-Causality & Integrity
  // ------------------------------------------------------------
  console.log("\nTEST E: Model Explanation & Factor Non-Causality");
  {
    const adminClient = createE2EMockSupabase({ userRole: "admin" });
    const detail = await getCampaignViabilityAssessmentById("e2e-assess-001", {
      supabaseClient: adminClient,
    });

    assert(Array.isArray(detail.top_supporting_factors) && detail.top_supporting_factors.length === 2, "Supporting factors array intact");
    assert(detail.top_supporting_factors[0] === "Early donor velocity in top decile", "First supporting factor preserved exactly");
    assert(Array.isArray(detail.top_risk_factors) && detail.top_risk_factors.length === 1, "Risk factors array intact");
    assert(detail.top_risk_factors[0] === "Target goal is in upper quartile", "Risk factor preserved exactly");

    // Check that terminology is neutral funding viability, not fraud/trustworthiness
    const serialized = JSON.stringify(detail).toLowerCase();
    assert(!serialized.includes("fraud"), "No fraud labeling in assessment data");
    assert(!serialized.includes("scam"), "No scam labeling in assessment data");
    assert(!serialized.includes("illegitimate"), "No illegitimacy labeling in assessment data");
  }

  // ------------------------------------------------------------
  // 6. TEST F — Unauthenticated Access Protection
  // ------------------------------------------------------------
  console.log("\nTEST F: Unauthenticated Access Protection (401)");
  {
    const unauthClient = createE2EMockSupabase({ userId: null });
    let unauthErr = null;
    try {
      await getCampaignViabilitySummary({ supabaseClient: unauthClient });
    } catch (e) {
      unauthErr = e;
    }
    assert(unauthErr?.statusCode === 401, "Summary service rejects unauthenticated request with 401");

    try {
      unauthErr = null;
      await getCampaignViabilityAssessments({ supabaseClient: unauthClient });
    } catch (e) {
      unauthErr = e;
    }
    assert(unauthErr?.statusCode === 401, "List service rejects unauthenticated request with 401");

    try {
      unauthErr = null;
      await getCampaignViabilityAssessmentById("e2e-assess-001", { supabaseClient: unauthClient });
    } catch (e) {
      unauthErr = e;
    }
    assert(unauthErr?.statusCode === 401, "Detail service rejects unauthenticated request with 401");
  }

  // ------------------------------------------------------------
  // 7. TEST G — Non-Admin Access Protection (403)
  // ------------------------------------------------------------
  console.log("\nTEST G: Non-Admin Access Protection (403)");
  {
    const nonAdminClient = createE2EMockSupabase({ userRole: "user", userId: "standard-user" });
    let forbiddenErr = null;

    try {
      await getCampaignViabilitySummary({ supabaseClient: nonAdminClient });
    } catch (e) {
      forbiddenErr = e;
    }
    assert(forbiddenErr?.statusCode === 403, "Summary service rejects non-admin user with 403");

    try {
      forbiddenErr = null;
      await getCampaignViabilityAssessments({ supabaseClient: nonAdminClient });
    } catch (e) {
      forbiddenErr = e;
    }
    assert(forbiddenErr?.statusCode === 403, "List service rejects non-admin user with 403");

    try {
      forbiddenErr = null;
      await getCampaignViabilityAssessmentById("e2e-assess-001", { supabaseClient: nonAdminClient });
    } catch (e) {
      forbiddenErr = e;
    }
    assert(forbiddenErr?.statusCode === 403, "Detail service rejects non-admin user with 403");
  }

  // ------------------------------------------------------------
  // 8. TEST H — Invalid / Missing Assessment ID (400/404)
  // ------------------------------------------------------------
  console.log("\nTEST H: Invalid & Missing Assessment ID Handling");
  {
    const adminClient = createE2EMockSupabase({ userRole: "admin" });

    // Empty ID rejection
    let invalidIdErr = null;
    try {
      await getCampaignViabilityAssessmentById("", { supabaseClient: adminClient });
    } catch (e) {
      invalidIdErr = e;
    }
    assert(invalidIdErr?.statusCode === 400, "Empty ID rejected with 400 Bad Request");

    // Missing ID returns null
    const missingResult = await getCampaignViabilityAssessmentById("nonexistent-id", {
      supabaseClient: adminClient,
    });
    assert(missingResult === null, "Missing assessment returns null without crashing or leaking SQL");
  }

  // ------------------------------------------------------------
  // 9. TEST I — Empty State Handling
  // ------------------------------------------------------------
  console.log("\nTEST I: Empty State Handling");
  {
    const emptyClient = createE2EMockSupabase({ userRole: "admin", assessments: [] });

    const emptySummary = await getCampaignViabilitySummary({ supabaseClient: emptyClient });
    assert(emptySummary.totalAssessed === 0, "Empty summary totalAssessed is 0");
    assert(emptySummary.averageViabilityScore === null, "Empty summary average score is null (not fake 0)");
    assert(emptySummary.lowRiskCount === 0, "Low risk count is 0");
    assert(emptySummary.mediumRiskCount === 0, "Medium risk count is 0");
    assert(emptySummary.highRiskCount === 0, "High risk count is 0");
    assert(emptySummary.lastAssessmentTimestamp === null, "Last assessment timestamp is null");

    const emptyList = await getCampaignViabilityAssessments({ supabaseClient: emptyClient });
    assert(emptyList.assessments.length === 0, "Empty assessment list is empty array");
    assert(emptyList.pagination.totalCount === 0, "Empty totalCount is 0");
    assert(emptyList.pagination.totalPages === 1, "Empty totalPages is 1");
  }

  // ------------------------------------------------------------
  // 10. TEST J — Database / API Failure Graceful Degradation
  // ------------------------------------------------------------
  console.log("\nTEST J: Database / API Failure Graceful Degradation");
  {
    const failingClient = createE2EMockSupabase({ userRole: "admin", failDatabase: true });
    let failErr = null;
    try {
      await getCampaignViabilitySummary({ supabaseClient: failingClient });
    } catch (e) {
      failErr = e;
    }
    assert(failErr !== null, "Failure caught properly without exposing internals");
    assert(!failErr.message.includes("postgres://") && !failErr.message.includes("service_role"), "No connection strings or secrets in error");
  }

  // ------------------------------------------------------------
  // 11. TEST K — Security & Privacy Audit
  // ------------------------------------------------------------
  console.log("\nTEST K: Security & Privacy Audit");
  {
    const adminClient = createE2EMockSupabase({ userRole: "admin" });
    const detail = await getCampaignViabilityAssessmentById("e2e-assess-001", { supabaseClient: adminClient });
    const serialized = JSON.stringify(detail);

    assert(!serialized.includes("stripe"), "No Stripe keys or customer IDs exposed");
    assert(!serialized.includes("password"), "No password or auth hashes exposed");
    assert(!serialized.includes("donor_email"), "No donor email fields exposed");
    assert(!serialized.includes("service_role"), "No service-role secrets exposed");
    assert(!serialized.includes("ML_API_URL"), "ML_API_URL is not exposed to frontend");
  }

  // ------------------------------------------------------------
  // 12. TEST L — Data Consistency Check
  // ------------------------------------------------------------
  console.log("\nTEST L: End-to-End Data Consistency Check");
  {
    const adminClient = createE2EMockSupabase({ userRole: "admin" });

    // Pick assessment e2e-assess-001
    const rawDBRecord = SEED_ASSESSMENTS[0];
    const listResponse = await getCampaignViabilityAssessments({
      campaignId: rawDBRecord.campaign_id,
      supabaseClient: adminClient,
    });
    const tableItem = listResponse.assessments[0];

    const detailItem = await getCampaignViabilityAssessmentById(rawDBRecord.id, {
      supabaseClient: adminClient,
    });

    assert(tableItem.viability_score === rawDBRecord.viability_score, "Table viability score matches DB exactly");
    assert(detailItem.viability_score === rawDBRecord.viability_score, "Detail viability score matches DB exactly");
    assert(tableItem.risk_probability === rawDBRecord.risk_probability, "Table risk probability matches DB exactly");
    assert(detailItem.risk_probability === rawDBRecord.risk_probability, "Detail risk probability matches DB exactly");
    assert(tableItem.risk_level === rawDBRecord.risk_level, "Table risk level matches DB exactly");
    assert(detailItem.risk_level === rawDBRecord.risk_level, "Detail risk level matches DB exactly");
    assert(tableItem.model_name === rawDBRecord.model_name, "Table model name matches DB exactly");
    assert(detailItem.model_name === rawDBRecord.model_name, "Detail model name matches DB exactly");
    assert(detailItem.top_supporting_factors[0] === rawDBRecord.top_supporting_factors[0], "Detail explanation matches DB factors");
  }

  console.log("\n===============================================================");
  console.log(`E2E VERIFICATION COMPLETE: ${passed} passed, ${failed} failed`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runEndToEndVerification().catch((err) => {
  console.error("E2E Verification Error:", err);
  process.exit(1);
});
