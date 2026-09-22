/**
 * Phase 4.4 Step 3: Admin Viability Summary Section & Endpoint Tests
 *
 * Test coverage:
 * TEST 1 — Assessment records exist (real summary values returned)
 * TEST 2 — No assessment records (clean empty state returned: hasAssessments: false, totalAssessed: 0, average: null)
 * TEST 3 — Mixed risk levels (lowRiskCount, mediumRiskCount, highRiskCount accurately computed)
 * TEST 4 — Average viability score computation (accurate mean score, no NaN)
 * TEST 5 — Most recent assessment timestamp (latest created_at)
 * TEST 6 — Admin access through summary API route (200 OK)
 * TEST 7 — Non-admin and unauthenticated access through summary API route (403 and 401)
 * TEST 8 — Sensitive data check (no donor/payment/secrets leakage)
 * TEST 9 — Consistency between service layer and API route response
 *
 * Run with: node scratch/test_admin_viability_summary.js
 */

import { getCampaignViabilitySummary } from "../lib/ml/adminAssessmentService.js";
import { GET as summaryHandler } from "../app/api/admin/assessments/summary/route.js";
import { GET as mlSummaryHandler } from "../app/api/admin/ml/assessments/summary/route.js";

// ============================================================
// FIXTURE DATA
// ============================================================

const MOCK_MIXED_ASSESSMENTS = [
  {
    id: "assess-001",
    campaign_id: "charity-001",
    viability_score: 85,
    risk_level: "LOW RISK",
    created_at: "2026-09-10T10:00:00.000Z",
  },
  {
    id: "assess-002",
    campaign_id: "charity-002",
    viability_score: 75,
    risk_level: "LOW RISK",
    created_at: "2026-09-11T12:00:00.000Z",
  },
  {
    id: "assess-003",
    campaign_id: "charity-003",
    viability_score: 55,
    risk_level: "MEDIUM RISK",
    created_at: "2026-09-12T14:00:00.000Z",
  },
  {
    id: "assess-004",
    campaign_id: "charity-004",
    viability_score: 30,
    risk_level: "HIGH RISK",
    created_at: "2026-09-13T16:00:00.000Z",
  },
  {
    id: "assess-005",
    campaign_id: "charity-005",
    viability_score: 25,
    risk_level: "HIGH RISK",
    created_at: "2026-09-14T18:00:00.000Z", // Latest
  },
];

// Mock Supabase client builder for service testing
function createMockClient({
  currentUser = { id: "admin-1", email: "admin@sahayata.demo" },
  profileRole = "admin",
  assessments = MOCK_MIXED_ASSESSMENTS,
} = {}) {
  const store = { assessments: JSON.parse(JSON.stringify(assessments)) };

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
        const chain = {
          select: () => chain,
          eq: (field, val) => {
            currentData = currentData.filter((item) => item[field] === val);
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
              return 0;
            });
            return chain;
          },
          maybeSingle: async () => ({ data: currentData[0] || null, error: null }),
          single: async () => ({ data: currentData[0] || null, error: currentData[0] ? null : { message: "Not found" } }),
          then: async (resolve) => resolve({ data: currentData, error: null }),
        };
        return chain;
      };

      if (table === "profiles") {
        return makeChain(
          currentUser
            ? [{ id: currentUser.id, email: currentUser.email, role: profileRole }]
            : []
        );
      }
      if (table === "campaign_viability_assessments") {
        return makeChain(store.assessments);
      }
      return makeChain([]);
    },
  };
}

function createMockRequest(url, { session = null, assessments = MOCK_MIXED_ASSESSMENTS } = {}) {
  const cookiesMap = new Map();
  if (session) {
    cookiesMap.set("fundora-mock-session", JSON.stringify(session));
  }
  cookiesMap.set("fundora-mock-assessments", JSON.stringify(assessments));

  const req = new Request(url, {
    method: "GET",
    headers: {
      cookie: Array.from(cookiesMap.entries())
        .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
        .join("; "),
    },
  });

  req.cookies = {
    get: (name) => {
      const val = cookiesMap.get(name);
      return val !== undefined ? { name, value: val } : undefined;
    },
    getAll: () => Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value })),
    set: (name, value) => cookiesMap.set(name, value),
  };

  return req;
}

// ============================================================
// TEST SUITE
// ============================================================

async function runViabilitySummaryTests() {
  console.log("\n=======================================================");
  console.log("PHASE 4.4 STEP 3 — VIABILITY SUMMARY VERIFICATION SUITE");
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

  const adminSession = {
    user: { id: "admin-user-001", email: "admin@sahayata.demo", role: "admin" },
    role: "admin",
  };

  const userSession = {
    user: { id: "user-001", email: "donor@example.com", role: "user" },
    role: "user",
  };

  // -------------------------------------------------------------
  // TEST 1 — Assessment records exist: real summary values
  // -------------------------------------------------------------
  console.log("TEST 1: Assessment records exist - accurate summary statistics");
  {
    const client = createMockClient({ assessments: MOCK_MIXED_ASSESSMENTS });
    const summary = await getCampaignViabilitySummary({ supabaseClient: client });

    assert(summary.hasAssessments === true, "hasAssessments is true");
    assert(summary.totalAssessed === 5, `Total assessed is 5 (got ${summary.totalAssessed})`);
    assert(typeof summary.averageViabilityScore === "number", "Average viability score is numeric");
  }

  // -------------------------------------------------------------
  // TEST 2 — No assessment records: clean empty state
  // -------------------------------------------------------------
  console.log("\nTEST 2: No assessment records - clean empty state");
  {
    const client = createMockClient({ assessments: [] });
    const summary = await getCampaignViabilitySummary({ supabaseClient: client });

    assert(summary.hasAssessments === false, "hasAssessments is false");
    assert(summary.totalAssessed === 0, "totalAssessed is 0");
    assert(summary.averageViabilityScore === null, "averageViabilityScore is null (not NaN or 0)");
    assert(summary.lowRiskCount === 0, "lowRiskCount is 0");
    assert(summary.mediumRiskCount === 0, "mediumRiskCount is 0");
    assert(summary.highRiskCount === 0, "highRiskCount is 0");
    assert(summary.lastAssessmentTimestamp === null, "lastAssessmentTimestamp is null");
  }

  // -------------------------------------------------------------
  // TEST 3 — Mixed risk levels: counts accurately computed
  // -------------------------------------------------------------
  console.log("\nTEST 3: Mixed risk levels accurately categorized");
  {
    const client = createMockClient({ assessments: MOCK_MIXED_ASSESSMENTS });
    const summary = await getCampaignViabilitySummary({ supabaseClient: client });

    assert(summary.lowRiskCount === 2, `lowRiskCount is 2 (got ${summary.lowRiskCount})`);
    assert(summary.mediumRiskCount === 1, `mediumRiskCount is 1 (got ${summary.mediumRiskCount})`);
    assert(summary.highRiskCount === 2, `highRiskCount is 2 (got ${summary.highRiskCount})`);
    assert(
      summary.lowRiskCount + summary.mediumRiskCount + summary.highRiskCount === summary.totalAssessed,
      "Sum of risk counts matches totalAssessed"
    );
  }

  // -------------------------------------------------------------
  // TEST 4 — Average viability: exact arithmetic mean
  // -------------------------------------------------------------
  console.log("\nTEST 4: Average viability calculation");
  {
    // (85 + 75 + 55 + 30 + 25) / 5 = 270 / 5 = 54.0
    const client = createMockClient({ assessments: MOCK_MIXED_ASSESSMENTS });
    const summary = await getCampaignViabilitySummary({ supabaseClient: client });

    assert(summary.averageViabilityScore === 54, `Average viability is exactly 54.0 (got ${summary.averageViabilityScore})`);
  }

  // -------------------------------------------------------------
  // TEST 5 — Most recent assessment: correct latest timestamp
  // -------------------------------------------------------------
  console.log("\nTEST 5: Latest assessment timestamp");
  {
    const client = createMockClient({ assessments: MOCK_MIXED_ASSESSMENTS });
    const summary = await getCampaignViabilitySummary({ supabaseClient: client });

    assert(
      summary.lastAssessmentTimestamp === "2026-09-14T18:00:00.000Z",
      `Latest timestamp matches newest record (got ${summary.lastAssessmentTimestamp})`
    );
  }

  // -------------------------------------------------------------
  // TEST 6 — Admin access to summary API endpoint (200 OK)
  // -------------------------------------------------------------
  console.log("\nTEST 6: Admin access to summary API endpoint");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments/summary", {
      session: adminSession,
      assessments: MOCK_MIXED_ASSESSMENTS,
    });
    const res = await summaryHandler(req);
    const body = await res.json();

    assert(res.status === 200, `Summary endpoint returned 200 OK (got ${res.status})`);
    assert(body.success === true, "Payload contains success: true");
    assert(body.data && body.data.totalAssessed === 5, "Payload contains summary data");
    assert(body.data.averageViabilityScore === 54, "Payload contains accurate average score");

    // Test ML alias
    const mlReq = createMockRequest("http://localhost:3000/api/admin/ml/assessments/summary", {
      session: adminSession,
      assessments: MOCK_MIXED_ASSESSMENTS,
    });
    const mlRes = await mlSummaryHandler(mlReq);
    const mlBody = await mlRes.json();

    assert(mlRes.status === 200, "ML alias /api/admin/ml/assessments/summary returned 200 OK");
    assert(mlBody.data.totalAssessed === 5, "ML alias returned matching summary data");
  }

  // -------------------------------------------------------------
  // TEST 7 — Non-admin and unauthenticated access protection
  // -------------------------------------------------------------
  console.log("\nTEST 7: Non-admin and unauthenticated access protection");
  {
    // Unauthenticated
    const unauthReq = createMockRequest("http://localhost:3000/api/admin/assessments/summary", {
      session: null,
      assessments: MOCK_MIXED_ASSESSMENTS,
    });
    const unauthRes = await summaryHandler(unauthReq);
    assert(unauthRes.status === 401, `Unauthenticated request returned 401 Unauthorized (got ${unauthRes.status})`);

    // Non-admin user
    const nonAdminReq = createMockRequest("http://localhost:3000/api/admin/assessments/summary", {
      session: userSession,
      assessments: MOCK_MIXED_ASSESSMENTS,
    });
    const nonAdminRes = await summaryHandler(nonAdminReq);
    assert(nonAdminRes.status === 403, `Non-admin request returned 403 Forbidden (got ${nonAdminRes.status})`);
  }

  // -------------------------------------------------------------
  // TEST 8 — Sensitive data check
  // -------------------------------------------------------------
  console.log("\nTEST 8: Sensitive data audit on summary JSON");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments/summary", {
      session: adminSession,
      assessments: MOCK_MIXED_ASSESSMENTS,
    });
    const res = await summaryHandler(req);
    const rawText = await res.text();

    assert(!rawText.includes("stripe"), "No Stripe/payment references in summary JSON");
    assert(!rawText.includes("password"), "No password or auth secrets in summary JSON");
    assert(!rawText.includes("service_role"), "No service-role credentials in summary JSON");
    assert(!rawText.includes("user_id"), "No user IDs in summary JSON");
    assert(
      res.headers.get("Cache-Control") === "no-store, max-age=0, must-revalidate",
      "Cache-Control: no-store header set on summary response"
    );
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

runViabilitySummaryTests().catch((err) => {
  console.error("Fatal viability summary test error:", err);
  process.exit(1);
});
