/**
 * Phase 4.5 Step 2: User-Facing Viability Data Access Test Suite
 *
 * Tests:
 * 1. Valid campaign ID + assessment exists -> returns stored assessment
 * 2. Valid campaign ID + no assessment exists -> returns null
 * 3. Invalid/empty campaign ID -> returns null
 * 4. Multiple assessment records -> returns latest assessment (created_at DESC)
 * 5. Batch lookup for multiple campaigns (getCampaignsViabilityAssessments)
 * 6. Database failure handling -> handles gracefully without exposing secrets
 * 7. Privacy & Security audit -> no donor PII, Stripe keys, passwords, or service-role secrets
 * 8. User API route verification -> GET /api/campaigns/[id]/viability & GET /api/charities/[id]/viability
 *
 * Run with: node scratch/test_user_viability_data_access.js
 */

import {
  getCampaignViabilityAssessment,
  getCampaignsViabilityAssessments,
} from "../lib/ml/assessmentService.js";
import { GET as campaignViabilityRoute } from "../app/api/campaigns/[id]/viability/route.js";
import { GET as charityViabilityRoute } from "../app/api/charities/[id]/viability/route.js";

// ============================================================
// FIXTURE DATA
// ============================================================

const MOCK_ASSESSMENTS = [
  {
    id: "assess-uuid-001",
    campaign_id: "charity-uuid-001",
    viability_score: 85,
    risk_probability: 0.152,
    risk_level: "LOW RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    n_features: 56,
    calibration: "Platt Scaling (Sigmoid)",
    base_rate_risk: 0.4996,
    top_risk_factors: ["Target goal in upper quartile"],
    top_supporting_factors: ["Early donor velocity in top decile", "Clear project narrative"],
    detailed_risk_factors: [{ feature: "goal", impact: 0.14 }],
    detailed_supporting_factors: [{ feature: "early_velocity", impact: 0.42 }],
    research_disclaimer: "Predicted outcome for advisory use.",
    created_at: "2026-09-03T10:00:00Z",
  },
  // Second older assessment for charity-uuid-001 to test latest selection
  {
    id: "assess-uuid-001-old",
    campaign_id: "charity-uuid-001",
    viability_score: 70,
    risk_probability: 0.30,
    risk_level: "LOW RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    n_features: 56,
    calibration: "Platt Scaling (Sigmoid)",
    base_rate_risk: 0.4996,
    top_risk_factors: [],
    top_supporting_factors: [],
    created_at: "2026-09-01T10:00:00Z",
  },
  {
    id: "assess-uuid-002",
    campaign_id: "charity-uuid-002",
    viability_score: 48,
    risk_probability: 0.52,
    risk_level: "MEDIUM RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    n_features: 56,
    calibration: "Platt Scaling (Sigmoid)",
    base_rate_risk: 0.4996,
    top_risk_factors: ["Moderate early contribution count"],
    top_supporting_factors: ["Verified charity"],
    created_at: "2026-09-04T10:00:00Z",
  },
];

// Helper mock client
function createMockSupabase({ failDatabase = false } = {}) {
  return {
    from: (table) => {
      if (failDatabase) {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({ data: null, error: { message: "Database connection failed" } }),
              }),
            }),
            in: () => ({
              order: async () => ({ data: null, error: { message: "Database connection failed" } }),
            }),
          }),
        };
      }

      let filterField = null;
      let filterVal = null;
      let inField = null;
      let inVals = null;
      let orders = [];
      let limitCount = null;

      const chain = {
        select: () => chain,
        eq: (field, val) => {
          filterField = field;
          filterVal = val;
          return chain;
        },
        in: (field, vals) => {
          inField = field;
          inVals = vals;
          return chain;
        },
        order: (field, { ascending } = {}) => {
          orders.push({ field, ascending: !!ascending });
          return chain;
        },
        limit: (n) => {
          limitCount = n;
          return chain;
        },
        then: (resolve) => {
          let results = [...MOCK_ASSESSMENTS];
          if (filterField && filterVal !== undefined) {
            results = results.filter((item) => item[filterField] === filterVal);
          }
          if (inField && Array.isArray(inVals)) {
            results = results.filter((item) => inVals.includes(item[inField]));
          }
          if (orders.length > 0) {
            results.sort((a, b) => {
              for (const { field, ascending } of orders) {
                let cmp = 0;
                if (field === "created_at") {
                  const tA = new Date(a.created_at).getTime() || 0;
                  const tB = new Date(b.created_at).getTime() || 0;
                  cmp = tA - tB;
                } else {
                  cmp = String(a[field] || "").localeCompare(String(b[field] || ""));
                }
                if (cmp !== 0) {
                  return ascending ? cmp : -cmp;
                }
              }
              return 0;
            });
          }
          if (limitCount !== null) {
            results = results.slice(0, limitCount);
          }
          resolve({ data: results, error: null });
        },
      };

      return chain;
    },
  };
}

// ============================================================
// TEST RUNNER
// ============================================================

async function runTests() {
  console.log("==============================================================");
  console.log("PHASE 4.5 STEP 2 — USER-FACING VIABILITY DATA ACCESS TESTS");
  console.log("==============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Valid campaign ID with assessment
  console.log("TEST 1: Valid Campaign ID + Assessment Exists");
  {
    const mockClient = createMockSupabase();
    const result = await getCampaignViabilityAssessment("charity-uuid-001", { supabaseClient: mockClient });

    assert(result !== null, "Assessment returned for valid campaign ID");
    assert(result.campaign_id === "charity-uuid-001", "Campaign ID matches requested ID");
    assert(result.viability_score === 85, "Stored viability score matches exactly (85)");
    assert(result.risk_probability === 0.152, "Stored risk probability matches exactly (0.152)");
    assert(result.risk_level === "LOW RISK", "Stored risk level matches ('LOW RISK')");
    assert(result.prediction_horizon_hours === 48, "Prediction horizon is 48 hours");
    assert(result.model_name === "Random Forest Champion", "Model name preserved");
    assert(result.n_features === 56, "Engineered features count is 56");
    assert(result.calibration === "Platt Scaling (Sigmoid)", "Calibration method preserved");
    assert(result.base_rate_risk === 0.4996, "Base-rate risk is 0.4996");
    assert(Array.isArray(result.top_supporting_factors) && result.top_supporting_factors.length === 2, "Supporting factors intact");
    assert(Array.isArray(result.top_risk_factors) && result.top_risk_factors.length === 1, "Risk factors intact");
  }

  // 2. Valid campaign ID with no assessment
  console.log("\nTEST 2: Valid Campaign ID + No Assessment (e.g. < 48 hours)");
  {
    const mockClient = createMockSupabase();
    const result = await getCampaignViabilityAssessment("charity-uuid-no-assessment", { supabaseClient: mockClient });

    assert(result === null, "Returns null safely when campaign has no assessment");
  }

  // 3. Invalid / empty campaign ID
  console.log("\nTEST 3: Invalid / Empty Campaign ID");
  {
    const mockClient = createMockSupabase();
    const emptyResult = await getCampaignViabilityAssessment("", { supabaseClient: mockClient });
    assert(emptyResult === null, "Empty string campaignId returns null safely");

    const nullResult = await getCampaignViabilityAssessment(null, { supabaseClient: mockClient });
    assert(nullResult === null, "Null campaignId returns null safely");

    const undefinedResult = await getCampaignViabilityAssessment(undefined, { supabaseClient: mockClient });
    assert(undefinedResult === null, "Undefined campaignId returns null safely");
  }

  // 4. Multiple assessment records (selection rule)
  console.log("\nTEST 4: Multiple Assessment Records Selection Rule (created_at DESC)");
  {
    const mockClient = createMockSupabase();
    const result = await getCampaignViabilityAssessment("charity-uuid-001", { supabaseClient: mockClient });

    // Latest record for charity-uuid-001 has viability_score 85 and created_at "2026-09-03" (older is 70, "2026-09-01")
    assert(result.id === "assess-uuid-001", "Returns the latest assessment ID ('assess-uuid-001')");
    assert(result.viability_score === 85, "Returns latest score (85, not older 70)");
    assert(result.created_at === "2026-09-03T10:00:00Z", "Returned record has latest created_at");
  }

  // 5. Batch lookup for multiple campaigns
  console.log("\nTEST 5: Batch Lookup (getCampaignsViabilityAssessments)");
  {
    const mockClient = createMockSupabase();
    const batchMap = await getCampaignsViabilityAssessments(
      ["charity-uuid-001", "charity-uuid-002", "charity-uuid-none"],
      { supabaseClient: mockClient }
    );

    assert(typeof batchMap === "object", "Returns map object");
    assert(batchMap["charity-uuid-001"]?.viability_score === 85, "Correct score for campaign 1");
    assert(batchMap["charity-uuid-002"]?.viability_score === 48, "Correct score for campaign 2");
    assert(batchMap["charity-uuid-none"] === undefined, "Unassessed campaign is not in map");
  }

  // 6. Database failure handling
  console.log("\nTEST 6: Database Failure Handling");
  {
    const failClient = createMockSupabase({ failDatabase: true });
    let dbErr = null;
    try {
      await getCampaignViabilityAssessment("charity-uuid-001", { supabaseClient: failClient });
    } catch (err) {
      dbErr = err;
    }

    assert(dbErr !== null, "Database failure throws an error cleanly");
    assert(dbErr.message.includes("Failed to retrieve campaign viability assessment"), "Controlled error message without leaking secrets");
  }

  // 7. Privacy & Security audit
  console.log("\nTEST 7: Privacy & Security Audit");
  {
    const mockClient = createMockSupabase();
    const result = await getCampaignViabilityAssessment("charity-uuid-001", { supabaseClient: mockClient });
    const serialized = JSON.stringify(result);

    assert(!serialized.includes("password"), "No password fields exposed");
    assert(!serialized.includes("donor_email"), "No donor email fields exposed");
    assert(!serialized.includes("stripe"), "No Stripe tokens exposed");
    assert(!serialized.includes("service_role"), "No service-role secrets exposed");
    assert(!serialized.includes("ML_API_URL"), "ML_API_URL not exposed");
  }

  // 8. Public API route endpoints
  console.log("\nTEST 8: User API Route Endpoints");
  {
    // Test GET /api/campaigns/[id]/viability
    const req1 = new Request("http://localhost:3000/api/campaigns/charity-uuid-001/viability");
    const res1 = await campaignViabilityRoute(req1, { params: Promise.resolve({ id: "charity-uuid-001" }) });
    assert(res1.status === 200, "Campaign viability route returns 200 OK");
    const json1 = await res1.json();
    assert(json1.success === true, "Response payload contains success: true");

    // Test GET /api/charities/[id]/viability alias
    const req2 = new Request("http://localhost:3000/api/charities/charity-uuid-001/viability");
    const res2 = await charityViabilityRoute(req2, { params: Promise.resolve({ id: "charity-uuid-001" }) });
    assert(res2.status === 200, "Charity viability alias route returns 200 OK");
    const json2 = await res2.json();
    assert(json2.success === true, "Response payload contains success: true");

    // Test invalid ID on API route
    const reqBad = new Request("http://localhost:3000/api/campaigns/%20/viability");
    const resBad = await campaignViabilityRoute(reqBad, { params: Promise.resolve({ id: "   " }) });
    assert(resBad.status === 400, "Whitespace campaign ID rejected with 400 Bad Request");
  }

  console.log("\n==============================================================");
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
