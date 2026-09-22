/**
 * Phase 4.4 Step 5: Campaign Viability Assessment Detail View Test Suite
 *
 * Tests the detail route integration, authorization, factor explanations,
 * model metadata, edge cases, and security boundaries.
 *
 * Run with: node scratch/test_admin_viability_detail.js
 */

import { GET as detailHandler } from "../app/api/admin/assessments/[id]/route.js";
import { getCampaignViabilityAssessmentById } from "../lib/ml/adminAssessmentService.js";

// ============================================================
// FIXTURE DATA
// ============================================================

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
    top_risk_factors: ["Target goal is in top quartile of category"],
    top_supporting_factors: ["High early donor velocity", "Detailed campaign narrative"],
    detailed_risk_factors: [{ feature: "goal", impact: 0.12 }],
    detailed_supporting_factors: [{ feature: "early_donations_count", impact: 0.35 }],
    research_disclaimer: "Predicted outcome for advisory use.",
    created_at: "2026-09-03T10:00:00Z",
    updated_at: "2026-09-03T10:00:00Z",
  },
  {
    id: "assess-uuid-empty-factors",
    campaign_id: "charity-uuid-002",
    viability_score: 55,
    risk_probability: 0.45,
    risk_level: "MEDIUM RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    n_features: 56,
    calibration: "Platt Scaling",
    base_rate_risk: 0.4996,
    top_risk_factors: [],
    top_supporting_factors: [],
    detailed_risk_factors: [],
    detailed_supporting_factors: [],
    research_disclaimer: null,
    created_at: "2026-09-04T10:00:00Z",
    updated_at: "2026-09-04T10:00:00Z",
  }
];

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

// Helper to create mock authenticated clients
function createMockSupabase({ userRole = "admin", userId = "user-123" } = {}) {
  const user = userId
    ? { id: userId, email: userRole === "admin" ? "admin@fundora.org" : "user@example.com" }
    : null;

  return {
    auth: {
      getUser: async () => ({
        data: { user },
        error: user ? null : { message: "No active session" },
      }),
    },
    from: (table) => {
      let selectedFields = "*";
      let filterField = null;
      let filterVal = null;

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
        maybeSingle: async () => {
          if (table === "profiles") {
            if (!user) return { data: null, error: null };
            return {
              data: { id: user.id, role: userRole, email: user.email },
              error: null,
            };
          }

          if (table === "campaign_viability_assessments") {
            const found = MOCK_ASSESSMENTS.find((a) => a[filterField] === filterVal);
            if (!found) return { data: null, error: null };

            const charity = MOCK_CHARITIES.find((c) => c.id === found.campaign_id);
            return {
              data: {
                ...found,
                charities: charity || null,
              },
              error: null,
            };
          }

          if (table === "charities") {
            const charity = MOCK_CHARITIES.find((c) => c[filterField] === filterVal);
            return { data: charity || null, error: null };
          }

          return { data: null, error: null };
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
  console.log("==================================================");
  console.log("RUNNING PHASE 4.4 STEP 5 ASSESSMENT DETAIL TESTS");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${message}`);
      failed++;
    }
  }

  // ------------------------------------------------------------
  // TEST 1 — Valid assessment retrieval
  // ------------------------------------------------------------
  console.log("TEST 1: Valid Assessment Retrieval");
  {
    const mockClient = createMockSupabase({ userRole: "admin" });
    const result = await getCampaignViabilityAssessmentById("assess-uuid-001", {
      supabaseClient: mockClient,
    });

    assert(result !== null, "Assessment was returned for valid ID");
    assert(result.id === "assess-uuid-001", "Correct assessment ID returned");
    assert(result.viability_score === 82, "Stored viability score preserved exactly (82)");
    assert(result.risk_probability === 0.185, "Stored risk probability preserved exactly (0.185)");
    assert(result.risk_level === "LOW RISK", "Correct risk level (LOW RISK)");
    assert(result.prediction_horizon_hours === 48, "Correct prediction horizon (48h)");
    assert(result.campaign?.name === "Clean Water for All", "Campaign details joined correctly");
  }

  // ------------------------------------------------------------
  // TEST 2 — Invalid / nonexistent assessment ID
  // ------------------------------------------------------------
  console.log("\nTEST 2: Invalid / Nonexistent Assessment ID");
  {
    const mockClient = createMockSupabase({ userRole: "admin" });
    const result = await getCampaignViabilityAssessmentById("non-existent-uuid", {
      supabaseClient: mockClient,
    });
    assert(result === null, "Returns null for nonexistent assessment ID");

    // Test API route handler directly for 404
    const req = new Request("http://localhost:3000/api/admin/assessments/non-existent-uuid");
    const response = await detailHandler(req, { params: Promise.resolve({ id: "non-existent-uuid" }) });
    assert(response.status === 404 || response.status === 401, "API returns proper status code for missing record");
  }

  // ------------------------------------------------------------
  // TEST 3 — Unauthenticated user
  // ------------------------------------------------------------
  console.log("\nTEST 3: Unauthenticated User Request");
  {
    const mockClient = createMockSupabase({ userId: null });
    let unauthErr = null;
    try {
      await getCampaignViabilityAssessmentById("assess-uuid-001", {
        supabaseClient: mockClient,
      });
    } catch (e) {
      unauthErr = e;
    }
    assert(unauthErr !== null, "Unauthenticated access throws an authorization error");
    assert(unauthErr?.statusCode === 401, "Error contains status 401 UNAUTHORIZED");
  }

  // ------------------------------------------------------------
  // TEST 4 — Non-admin user
  // ------------------------------------------------------------
  console.log("\nTEST 4: Non-Admin User Request");
  {
    const mockClient = createMockSupabase({ userRole: "user" });
    let forbiddenErr = null;
    try {
      await getCampaignViabilityAssessmentById("assess-uuid-001", {
        supabaseClient: mockClient,
      });
    } catch (e) {
      forbiddenErr = e;
    }
    assert(forbiddenErr !== null, "Non-admin access throws authorization error");
    assert(forbiddenErr?.statusCode === 403, "Error contains status 403 FORBIDDEN");
  }

  // ------------------------------------------------------------
  // TEST 5 — Explanation rendering fields
  // ------------------------------------------------------------
  console.log("\nTEST 5: Explanation & Factor Rendering Fields");
  {
    const mockClient = createMockSupabase({ userRole: "admin" });
    const result = await getCampaignViabilityAssessmentById("assess-uuid-001", {
      supabaseClient: mockClient,
    });

    assert(Array.isArray(result.top_supporting_factors), "top_supporting_factors is an array");
    assert(result.top_supporting_factors.length === 2, "2 supporting factors returned");
    assert(result.top_supporting_factors[0] === "High early donor velocity", "First supporting factor preserved");

    assert(Array.isArray(result.top_risk_factors), "top_risk_factors is an array");
    assert(result.top_risk_factors.length === 1, "1 risk factor returned");
    assert(result.top_risk_factors[0] === "Target goal is in top quartile of category", "Risk factor preserved");
  }

  // ------------------------------------------------------------
  // TEST 6 — Model metadata fields
  // ------------------------------------------------------------
  console.log("\nTEST 6: Model Metadata Fields");
  {
    const mockClient = createMockSupabase({ userRole: "admin" });
    const result = await getCampaignViabilityAssessmentById("assess-uuid-001", {
      supabaseClient: mockClient,
    });

    assert(result.model_name === "Random Forest Champion", "Model name preserved");
    assert(result.model_type === "RandomForestClassifier", "Model type preserved");
    assert(result.n_features === 56, "Engineered features count preserved (56)");
    assert(result.calibration === "Platt Scaling (Sigmoid)", "Calibration method preserved");
    assert(result.base_rate_risk === 0.4996, "Base-rate risk preserved (0.4996)");
  }

  // ------------------------------------------------------------
  // TEST 7 — Clean fallback state (empty factors / missing disclaimer)
  // ------------------------------------------------------------
  console.log("\nTEST 7: Fallback States");
  {
    const mockClient = createMockSupabase({ userRole: "admin" });
    const result = await getCampaignViabilityAssessmentById("assess-uuid-empty-factors", {
      supabaseClient: mockClient,
    });

    assert(Array.isArray(result.top_supporting_factors) && result.top_supporting_factors.length === 0, "Empty supporting factors gracefully handled");
    assert(Array.isArray(result.top_risk_factors) && result.top_risk_factors.length === 0, "Empty risk factors gracefully handled");
    assert(result.research_disclaimer === null, "Missing research disclaimer defaults cleanly");
  }

  // ------------------------------------------------------------
  // TEST 8 — Sensitive data check
  // ------------------------------------------------------------
  console.log("\nTEST 8: Sensitive Data Privacy Check");
  {
    const mockClient = createMockSupabase({ userRole: "admin" });
    const result = await getCampaignViabilityAssessmentById("assess-uuid-001", {
      supabaseClient: mockClient,
    });

    const serialized = JSON.stringify(result);
    assert(!serialized.includes("password"), "No password fields exposed");
    assert(!serialized.includes("donor_email"), "No donor email fields exposed");
    assert(!serialized.includes("card_number") && !serialized.includes("stripe"), "No payment fields exposed");
    assert(!serialized.includes("service_role"), "No service role secret exposed");
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
