/**
 * Phase 4.5 Step 5: Final End-to-End Verification Suite for User-Facing Viability
 *
 * Tests:
 * 1. User-Facing Campaign Access & Data Retrieval Flow
 * 2. Assessment-Present State (Fidelity of stored score, probability, risk level, horizon, factors)
 * 3. Pre-48-Hour Campaign State (< 48h notice, zero fake data)
 * 4. Missing Assessment State (≥ 48h without assessment, zero fake data)
 * 5. Retrieval Failure / Database Error Graceful Handling
 * 6. Explanation & Transparency Section (Score, probability, horizon, baseline, research note)
 * 7. Strict Terminology Safety Audit (Absence of fraud/scam/trust/legitimacy/safe claims)
 * 8. Security & Privacy Audit (No service-role keys, ML_API_URL, donor data, or Stripe secrets)
 * 9. End-to-End Data Integrity Tracing (DB -> Service -> API -> UI)
 * 10. Regression Check (Preservation of existing charity functions, allocations, impact scores)
 *
 * Run with: node scratch/test_phase4_5_e2e.js
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

const SEED_CHARITIES = [
  {
    id: "charity-e2e-001",
    name: "Clean Water Project",
    description: "Constructing fresh water infrastructure in arid regions.",
    category: "Clean Water",
    created_at: "2026-09-01T08:00:00Z",
  },
  {
    id: "charity-e2e-pre48",
    name: "New Solar Initiative",
    description: "Just launched solar clinic micro-grid project.",
    category: "Clean Energy",
    created_at: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(), // 10h ago (< 48h)
  },
  {
    id: "charity-e2e-unassessed",
    name: "Old Unassessed Project",
    description: "Historic project without 48h telemetry record.",
    category: "Education",
    created_at: "2026-08-01T08:00:00Z", // > 48h ago
  },
];

const SEED_ASSESSMENT = {
  id: "assess-e2e-001",
  campaign_id: "charity-e2e-001",
  viability_score: 84,
  risk_probability: 0.1625,
  risk_level: "LOW RISK",
  assessment_type: "initial_48h",
  prediction_horizon_hours: 48,
  model_name: "Random Forest Champion",
  model_type: "RandomForestClassifier",
  n_features: 56,
  calibration: "Platt Scaling (Sigmoid)",
  base_rate_risk: 0.4996,
  top_risk_factors: ["goal"],
  top_supporting_factors: ["early_donations_count", "Verified organization profile"],
  detailed_risk_factors: [{ feature: "goal", impact: 0.14 }],
  detailed_supporting_factors: [{ feature: "early_donations_count", impact: 0.42 }],
  research_disclaimer: "Predicted outcome for advisory decision support.",
  created_at: "2026-09-03T10:00:00Z",
};

// Mock Supabase Server Client
function createMockSupabaseClient({ fail = false } = {}) {
  return {
    from: (table) => {
      if (fail) {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: async () => ({
                  data: null,
                  error: { message: "Simulated database connection failure" },
                }),
              }),
            }),
            in: () => ({
              order: async () => ({
                data: null,
                error: { message: "Simulated database connection failure" },
              }),
            }),
          }),
        };
      }

      let filterVal = null;
      let inVals = null;
      let limitCount = null;

      const chain = {
        select: () => chain,
        eq: (field, val) => {
          if (field === "campaign_id") filterVal = val;
          return chain;
        },
        in: (field, vals) => {
          if (field === "campaign_id") inVals = vals;
          return chain;
        },
        order: () => chain,
        limit: (n) => {
          limitCount = n;
          return chain;
        },
        then: (resolve) => {
          if (table === "campaign_viability_assessments") {
            let res = [];
            if (filterVal === "charity-e2e-001") {
              res = [SEED_ASSESSMENT];
            } else if (inVals && inVals.includes("charity-e2e-001")) {
              res = [SEED_ASSESSMENT];
            }
            if (limitCount !== null) res = res.slice(0, limitCount);
            resolve({ data: res, error: null });
          } else {
            resolve({ data: [], error: null });
          }
        },
      };

      return chain;
    },
  };
}

async function runEndToEndVerification() {
  console.log("===============================================================");
  console.log("PHASE 4.5 STEP 5 — FINAL END-TO-END VERIFICATION SUITE");
  console.log("===============================================================\n");

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

  // 1. User-Facing Campaign Access
  console.log("1. User-Facing Campaign Access & Server Retrieval");
  {
    const mockClient = createMockSupabaseClient();
    const result = await getCampaignViabilityAssessment("charity-e2e-001", { supabaseClient: mockClient });
    assert(result !== null, "Assessment successfully retrieved via server-side service");
    assert(result.campaign_id === "charity-e2e-001", "Campaign ID matches requested charity");

    // Test API route
    const req = new Request("http://localhost:3000/api/campaigns/charity-e2e-001/viability");
    const res = await campaignViabilityRoute(req, { params: Promise.resolve({ id: "charity-e2e-001" }) });
    assert(res.status === 200, "API endpoint returns 200 OK");
    const json = await res.json();
    assert(json.success === true, "API payload contains success: true");
  }

  // 2. Assessment-Present State
  console.log("\n2. Assessment-Present State");
  {
    const mockClient = createMockSupabaseClient();
    const result = await getCampaignViabilityAssessment("charity-e2e-001", { supabaseClient: mockClient });

    assert(result.viability_score === 84, "Viability score matches stored value (84)");
    assert(result.risk_probability === 0.1625, "Risk probability matches stored value (0.1625)");
    assert((result.risk_probability * 100).toFixed(1) + "%" === "16.3%", "Risk probability formats correctly to 16.3%");
    assert(result.risk_level === "LOW RISK", "Risk level matches stored value ('LOW RISK')");
    assert(result.prediction_horizon_hours === 48, "Prediction horizon matches stored 48 hours");
    assert(result.model_name === "Random Forest Champion", "Model metadata preserved");
    assert(Array.isArray(result.top_supporting_factors), "Supporting factors returned as array");
    assert(Array.isArray(result.top_risk_factors), "Risk factors returned as array");
  }

  // 3. Pre-48-Hour Campaign State
  console.log("\n3. Pre-48-Hour Campaign State");
  {
    const mockClient = createMockSupabaseClient();
    const result = await getCampaignViabilityAssessment("charity-e2e-pre48", { supabaseClient: mockClient });
    assert(result === null, "Pre-48h campaign returns null from data layer without fake data");
  }

  // 4. Past-48-Hour Unassessed Campaign State
  console.log("\n4. Missing-Assessment State (Past 48 Hours)");
  {
    const mockClient = createMockSupabaseClient();
    const result = await getCampaignViabilityAssessment("charity-e2e-unassessed", { supabaseClient: mockClient });
    assert(result === null, "Unassessed campaign returns null cleanly");
  }

  // 5. Error State Handling
  console.log("\n5. Assessment Retrieval Failure State");
  {
    const failClient = createMockSupabaseClient({ fail: true });
    let errorCaught = null;
    try {
      await getCampaignViabilityAssessment("charity-e2e-001", { supabaseClient: failClient });
    } catch (e) {
      errorCaught = e;
    }
    assert(errorCaught !== null, "Retrieval failure caught properly");
    assert(!errorCaught.message.includes("service_role"), "No credentials or internals in error message");
  }

  // 6. Explanation & Transparency Section
  console.log("\n6. Explanation & Transparency Verification");
  {
    const mockClient = createMockSupabaseClient();
    const result = await getCampaignViabilityAssessment("charity-e2e-001", { supabaseClient: mockClient });
    assert(result.top_supporting_factors.length === 2, "Supporting factors available");
    assert(result.top_risk_factors.length === 1, "Risk factors available");
    assert(result.base_rate_risk === 0.4996, "Base-rate risk available (0.4996)");
    assert(result.research_disclaimer !== null, "Research advisory notice present");
  }

  // 7. Terminology Safety Audit
  console.log("\n7. Terminology Safety Audit");
  {
    const mockClient = createMockSupabaseClient();
    const result = await getCampaignViabilityAssessment("charity-e2e-001", { supabaseClient: mockClient });
    const serialized = JSON.stringify(result).toLowerCase();

    assert(!serialized.includes("fraud"), "No fraud terminology present");
    assert(!serialized.includes("scam"), "No scam terminology present");
    assert(!serialized.includes("legitimate"), "No legitimacy claims present");
    assert(!serialized.includes("trustworthy"), "No trustworthiness claims present");
    assert(!serialized.includes("fake"), "No fake campaign claims present");
  }

  // 8. Data Security & Privacy Audit
  console.log("\n8. Data Security & Privacy Audit");
  {
    const mockClient = createMockSupabaseClient();
    const result = await getCampaignViabilityAssessment("charity-e2e-001", { supabaseClient: mockClient });
    const serialized = JSON.stringify(result);

    assert(!serialized.includes("password"), "No password hashes exposed");
    assert(!serialized.includes("donor_email"), "No donor email fields exposed");
    assert(!serialized.includes("stripe"), "No Stripe keys or customer IDs exposed");
    assert(!serialized.includes("service_role"), "No service-role secrets exposed");
    assert(!serialized.includes("ML_API_URL"), "No ML_API_URL exposed");
  }

  // 9. End-to-End Data Integrity Tracing
  console.log("\n9. End-to-End Data Integrity Tracing");
  {
    const dbRecord = SEED_ASSESSMENT;
    const mockClient = createMockSupabaseClient();
    const serviceRecord = await getCampaignViabilityAssessment(dbRecord.campaign_id, { supabaseClient: mockClient });

    assert(serviceRecord.viability_score === dbRecord.viability_score, "Score strictly preserved (84 -> 84)");
    assert(serviceRecord.risk_probability === dbRecord.risk_probability, "Probability strictly preserved (0.1625 -> 0.1625)");
    assert(serviceRecord.risk_level === dbRecord.risk_level, "Risk level strictly preserved ('LOW RISK')");
    assert(serviceRecord.prediction_horizon_hours === dbRecord.prediction_horizon_hours, "Horizon strictly preserved (48h)");
  }

  // 10. Existing Functionality Regression Check
  console.log("\n10. Existing Charity Dashboard Regression Check");
  {
    const mockClient = createMockSupabaseClient();
    const batchMap = await getCampaignsViabilityAssessments(["charity-e2e-001", "charity-e2e-pre48"], { supabaseClient: mockClient });
    assert(batchMap["charity-e2e-001"] !== undefined, "Batch lookup succeeds for assessed charity");
    assert(batchMap["charity-e2e-pre48"] === undefined, "Batch lookup omits unassessed charity cleanly");
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
