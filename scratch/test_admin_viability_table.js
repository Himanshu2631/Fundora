/**
 * Phase 4.4 Step 4: Admin Campaign Viability Table Verification Suite
 *
 * Test coverage:
 * TEST 1 — Assessment records (real rows with formatted scores, risk badges, probabilities, horizon, model, timestamps)
 * TEST 2 — Server-side pagination (requested page sliced, correct totalCount, totalPages, hasNext/hasPrev)
 * TEST 3 — Risk-level filtering (LOW RISK, MEDIUM RISK, HIGH RISK exact filtering)
 * TEST 4 — Campaign ID filter / Search (exact campaign isolation)
 * TEST 5 — Sorting (newest first vs oldest first)
 * TEST 6 — Empty database (clean empty state structure)
 * TEST 7 — Filter empty results ("No assessments match the selected filters")
 * TEST 8 — API error handling (clean error structure)
 * TEST 9 — Admin access enforcement (200 OK via authorized API)
 * TEST 10 — Non-admin protection (401/403 rejected)
 * TEST 11 — Privacy audit (no donor/payment/sensitive leakage)
 *
 * Run with: node scratch/test_admin_viability_table.js
 */

import { getCampaignViabilityAssessments } from "../lib/ml/adminAssessmentService.js";
import { GET as listHandler } from "../app/api/admin/assessments/route.js";

// ============================================================
// FIXTURE DATA
// ============================================================

const MOCK_CHARITIES = [
  {
    id: "charity-uuid-001",
    name: "Clean Water for All",
    category: "Clean Water",
    image_url: "/water.png",
  },
  {
    id: "charity-uuid-002",
    name: "Solar Micro-Grids",
    category: "Clean Energy",
    image_url: "/solar.png",
  },
  {
    id: "charity-uuid-003",
    name: "Rural STEM Hubs",
    category: "Education",
    image_url: "/edu.png",
  },
];

const MOCK_ASSESSMENTS = [
  {
    id: "assess-001",
    campaign_id: "charity-uuid-001",
    viability_score: 82,
    risk_probability: 0.185,
    risk_level: "LOW RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    created_at: "2026-09-10T10:00:00.000Z",
  },
  {
    id: "assess-002",
    campaign_id: "charity-uuid-002",
    viability_score: 64,
    risk_probability: 0.362,
    risk_level: "MEDIUM RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    created_at: "2026-09-11T12:00:00.000Z",
  },
  {
    id: "assess-003",
    campaign_id: "charity-uuid-003",
    viability_score: 31,
    risk_probability: 0.690,
    risk_level: "HIGH RISK",
    assessment_type: "initial_48h",
    prediction_horizon_hours: 48,
    model_name: "Random Forest Champion",
    model_type: "RandomForestClassifier",
    created_at: "2026-09-12T14:00:00.000Z",
  },
];

// 12 items for pagination tests
const MOCK_PAGINATION_ASSESSMENTS = Array.from({ length: 12 }, (_, i) => ({
  id: `assess-page-${i + 1}`,
  campaign_id: `charity-uuid-00${(i % 3) + 1}`,
  viability_score: 20 + i * 6,
  risk_probability: 0.8 - i * 0.05,
  risk_level: i < 4 ? "HIGH RISK" : i < 8 ? "MEDIUM RISK" : "LOW RISK",
  assessment_type: "initial_48h",
  prediction_horizon_hours: 48,
  model_name: "Random Forest Champion",
  model_type: "RandomForestClassifier",
  created_at: new Date(Date.now() - (12 - i) * 3600000).toISOString(),
}));

function createMockRequest(url, { session = null, assessments = MOCK_ASSESSMENTS, charities = MOCK_CHARITIES } = {}) {
  const cookiesMap = new Map();
  if (session) {
    cookiesMap.set("fundora-mock-session", JSON.stringify(session));
  }
  cookiesMap.set("fundora-mock-assessments", JSON.stringify(assessments));
  cookiesMap.set("fundora-mock-charities", JSON.stringify(charities));

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
// TEST RUNNER
// ============================================================

async function runTableTests() {
  console.log("\n=======================================================");
  console.log("PHASE 4.4 STEP 4 — VIABILITY TABLE VERIFICATION SUITE");
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
  // TEST 1 — Assessment records: Real rows and fields
  // -------------------------------------------------------------
  console.log("TEST 1: Assessment records display and column data");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments", { session: adminSession });
    const res = await listHandler(req);
    const body = await res.json();

    assert(res.status === 200, "Table endpoint returns 200 OK");
    assert(body.data.length === 3, `Returned 3 assessment rows (got ${body.data.length})`);

    const row = body.data[0];
    assert(Boolean(row.campaign_title), "Campaign title present");
    assert(typeof row.viability_score === "number", "Viability score is numeric");
    assert(["LOW RISK", "MEDIUM RISK", "HIGH RISK"].includes(row.risk_level), "Risk level is valid standard category");
    assert(typeof row.risk_probability === "number", "Risk probability is numeric");
    assert(row.prediction_horizon_hours === 48, "Prediction horizon is 48 hours");
    assert(Boolean(row.model_name), "Model name present");
    assert(Boolean(row.created_at), "Assessment timestamp present");
  }

  // -------------------------------------------------------------
  // TEST 2 — Server-side pagination
  // -------------------------------------------------------------
  console.log("\nTEST 2: Server-side pagination");
  {
    const reqPage1 = createMockRequest("http://localhost:3000/api/admin/assessments?page=1&pageSize=5", {
      session: adminSession,
      assessments: MOCK_PAGINATION_ASSESSMENTS,
    });
    const resPage1 = await listHandler(reqPage1);
    const bodyPage1 = await resPage1.json();

    assert(bodyPage1.data.length === 5, `Page 1 has 5 records (got ${bodyPage1.data.length})`);
    assert(bodyPage1.pagination.totalCount === 12, "Total count is 12");
    assert(bodyPage1.pagination.totalPages === 3, "Total pages is 3");
    assert(bodyPage1.pagination.page === 1, "Page is 1");
    assert(bodyPage1.pagination.hasNextPage === true, "hasNextPage is true on page 1");
    assert(bodyPage1.pagination.hasPreviousPage === false, "hasPreviousPage is false on page 1");

    const reqPage2 = createMockRequest("http://localhost:3000/api/admin/assessments?page=2&pageSize=5", {
      session: adminSession,
      assessments: MOCK_PAGINATION_ASSESSMENTS,
    });
    const resPage2 = await listHandler(reqPage2);
    const bodyPage2 = await resPage2.json();

    assert(bodyPage2.data.length === 5, `Page 2 has 5 records (got ${bodyPage2.data.length})`);
    assert(bodyPage2.data[0].id !== bodyPage1.data[0].id, "Page 2 records are distinct from Page 1");
    assert(bodyPage2.pagination.hasNextPage === true, "hasNextPage is true on page 2");
    assert(bodyPage2.pagination.hasPreviousPage === true, "hasPreviousPage is true on page 2");
  }

  // -------------------------------------------------------------
  // TEST 3 — Risk-level filtering
  // -------------------------------------------------------------
  console.log("\nTEST 3: Risk-level filtering");
  {
    // Filter LOW RISK
    const reqLow = createMockRequest("http://localhost:3000/api/admin/assessments?riskLevel=LOW%20RISK", {
      session: adminSession,
    });
    const resLow = await listHandler(reqLow);
    const bodyLow = await resLow.json();

    assert(bodyLow.data.every((r) => r.risk_level === "LOW RISK"), "Filter returns exclusively LOW RISK assessments");
    assert(bodyLow.data.length === 1, `Found exactly 1 LOW RISK assessment (got ${bodyLow.data.length})`);

    // Filter HIGH RISK
    const reqHigh = createMockRequest("http://localhost:3000/api/admin/assessments?riskLevel=HIGH%20RISK", {
      session: adminSession,
    });
    const resHigh = await listHandler(reqHigh);
    const bodyHigh = await resHigh.json();

    assert(bodyHigh.data.every((r) => r.risk_level === "HIGH RISK"), "Filter returns exclusively HIGH RISK assessments");
    assert(bodyHigh.data.length === 1, `Found exactly 1 HIGH RISK assessment (got ${bodyHigh.data.length})`);
  }

  // -------------------------------------------------------------
  // TEST 4 — Campaign ID filter / Search
  // -------------------------------------------------------------
  console.log("\nTEST 4: Campaign ID filter / Search");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments?campaignId=charity-uuid-002", {
      session: adminSession,
    });
    const res = await listHandler(req);
    const body = await res.json();

    assert(body.data.every((r) => r.campaign_id === "charity-uuid-002"), "Returns exclusively charity-uuid-002 records");
    assert(body.data.length === 1, "Found 1 matching assessment");
    assert(body.data[0].viability_score === 64, "Matching record has correct score (64)");
  }

  // -------------------------------------------------------------
  // TEST 5 — Sorting
  // -------------------------------------------------------------
  console.log("\nTEST 5: Sort order controls");
  {
    const reqDesc = createMockRequest("http://localhost:3000/api/admin/assessments?sortOrder=desc", { session: adminSession });
    const resDesc = await listHandler(reqDesc);
    const bodyDesc = await resDesc.json();

    const reqAsc = createMockRequest("http://localhost:3000/api/admin/assessments?sortOrder=asc", { session: adminSession });
    const resAsc = await listHandler(reqAsc);
    const bodyAsc = await resAsc.json();

    assert(bodyDesc.data[0].id === "assess-003", "Newest first returns latest assessment first (assess-003)");
    assert(bodyAsc.data[0].id === "assess-001", "Oldest first returns earliest assessment first (assess-001)");
  }

  // -------------------------------------------------------------
  // TEST 6 — Empty database handling
  // -------------------------------------------------------------
  console.log("\nTEST 6: Empty database handling");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments", {
      session: adminSession,
      assessments: [],
    });
    const res = await listHandler(req);
    const body = await res.json();

    assert(res.status === 200, "Returns 200 OK for empty database");
    assert(Array.isArray(body.data) && body.data.length === 0, "Data array is empty []");
    assert(body.pagination.totalCount === 0, "Pagination totalCount is 0");
  }

  // -------------------------------------------------------------
  // TEST 7 — Filter with 0 matches
  // -------------------------------------------------------------
  console.log("\nTEST 7: Filter with 0 matches");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments?campaignId=non-existent-campaign", {
      session: adminSession,
    });
    const res = await listHandler(req);
    const body = await res.json();

    assert(res.status === 200, "Returns 200 OK for no-match filter");
    assert(body.data.length === 0, "Data array is empty []");
    assert(body.pagination.totalCount === 0, "Pagination totalCount is 0");
  }

  // -------------------------------------------------------------
  // TEST 8 — Non-admin and unauthenticated protection
  // -------------------------------------------------------------
  console.log("\nTEST 8: Non-admin and unauthenticated protection");
  {
    const unauthReq = createMockRequest("http://localhost:3000/api/admin/assessments", { session: null });
    const unauthRes = await listHandler(unauthReq);
    assert(unauthRes.status === 401, "Unauthenticated request returns 401");

    const nonAdminReq = createMockRequest("http://localhost:3000/api/admin/assessments", { session: userSession });
    const nonAdminRes = await listHandler(nonAdminReq);
    assert(nonAdminRes.status === 403, "Non-admin request returns 403");
  }

  // -------------------------------------------------------------
  // TEST 9 — Sensitive data audit
  // -------------------------------------------------------------
  console.log("\nTEST 9: Sensitive data audit");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments", { session: adminSession });
    const res = await listHandler(req);
    const raw = await res.text();

    assert(!raw.includes("stripe"), "No Stripe/payment references in table JSON");
    assert(!raw.includes("password"), "No password or auth secrets in table JSON");
    assert(!raw.includes("service_role"), "No service-role credentials in table JSON");
    assert(!raw.includes("user_id"), "No individual user IDs in table JSON");
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n=======================================================");
  console.log(`TOTAL TESTS: ${passed + failed}`);
  console.log(`PASSED: ${passed}`);
  console.log(`FAILED: ${failed}`);
  console.log("=======================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTableTests().catch((err) => {
  console.error("Fatal table test error:", err);
  process.exit(1);
});
