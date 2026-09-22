/**
 * Phase 4.4 Step 2: Admin Viability Assessment API Route Tests
 *
 * Test coverage:
 * TEST 1 — Unauthenticated request (401 Unauthorized)
 * TEST 2 — Authenticated non-admin (403 Forbidden)
 * TEST 3 — Authorized admin (200 OK with assessment list & pagination)
 * TEST 4 — Authorized admin detail request (200 OK with correct assessment details)
 * TEST 5 — Invalid assessment ID & missing assessment (400 Bad Request / 404 Not Found)
 * TEST 6 — Unsupported query parameters / values (400 Bad Request)
 * TEST 7 — Pagination check (API uses range pagination and does not dump entire table)
 * TEST 8 — Sensitive data check (no donor, payment, secrets, or internal stack traces)
 *
 * Run with: node scratch/test_admin_assessment_api.js
 */

import { GET as listHandler } from "../app/api/admin/assessments/route.js";
import { GET as detailHandler } from "../app/api/admin/assessments/[id]/route.js";
import { GET as mlListHandler } from "../app/api/admin/ml/assessments/route.js";
import { GET as mlDetailHandler } from "../app/api/admin/ml/assessments/[id]/route.js";

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

// Generate 12 assessments for pagination testing
const MOCK_PAGINATION_ASSESSMENTS = Array.from({ length: 12 }, (_, i) => ({
  id: `assess-page-${i + 1}`,
  campaign_id: i % 2 === 0 ? "charity-uuid-001" : "charity-uuid-002",
  viability_score: 30 + i * 5,
  risk_probability: 0.7 - i * 0.04,
  risk_level: i < 4 ? "HIGH RISK" : i < 8 ? "MEDIUM RISK" : "LOW RISK",
  assessment_type: "initial_48h",
  prediction_horizon_hours: 48,
  model_name: "Random Forest Champion",
  model_type: "RandomForestClassifier",
  n_features: 56,
  calibration: "Platt Scaling (Sigmoid)",
  base_rate_risk: 0.4996,
  top_risk_factors: ["Factor A"],
  top_supporting_factors: ["Factor B"],
  created_at: new Date(Date.now() - (12 - i) * 3600000).toISOString(),
  updated_at: new Date(Date.now() - (12 - i) * 3600000).toISOString(),
}));

// ============================================================
// MOCK COOKIE / SESSION HELPERS FOR ROUTE TESTS
// ============================================================

function createMockRequest(url, { session = null, assessments = MOCK_ASSESSMENTS, charities = MOCK_CHARITIES } = {}) {
  const cookiesMap = new Map();

  if (session) {
    cookiesMap.set("fundora-mock-session", JSON.stringify(session));
  }
  cookiesMap.set("fundora-mock-assessments", JSON.stringify(assessments));
  cookiesMap.set("fundora-mock-charities", JSON.stringify(charities));

  // Build Request object with cookie header
  const cookieHeader = Array.from(cookiesMap.entries())
    .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
    .join("; ");

  const req = new Request(url, {
    method: "GET",
    headers: {
      cookie: cookieHeader,
    },
  });

  req.cookies = {
    get: (name) => {
      const val = cookiesMap.get(name);
      return val !== undefined ? { name, value: val } : undefined;
    },
    getAll: () => Array.from(cookiesMap.entries()).map(([name, value]) => ({ name, value })),
    set: (name, value) => {
      cookiesMap.set(name, value);
    },
  };

  return req;
}

// ============================================================
// TEST RUNNER
// ============================================================

async function runAllApiTests() {
  console.log("\n=======================================================");
  console.log("PHASE 4.4 STEP 2 — ADMIN ASSESSMENT API ROUTE VERIFICATION");
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
  // TEST 1 — Unauthenticated request (401 Unauthorized)
  // -------------------------------------------------------------
  console.log("TEST 1: Unauthenticated request rejected");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments", { session: null });
    const res = await listHandler(req);
    const body = await res.json();

    assert(res.status === 401, `List endpoint returned 401 Unauthorized (got ${res.status})`);
    assert(body.error && body.error.includes("Unauthorized"), "List error message indicates unauthorized");

    const detailReq = createMockRequest("http://localhost:3000/api/admin/assessments/assess-uuid-001", { session: null });
    const detailRes = await detailHandler(detailReq, { params: Promise.resolve({ id: "assess-uuid-001" }) });
    const detailBody = await detailRes.json();

    assert(detailRes.status === 401, `Detail endpoint returned 401 Unauthorized (got ${detailRes.status})`);
    assert(detailBody.error && detailBody.error.includes("Unauthorized"), "Detail error message indicates unauthorized");
  }

  // -------------------------------------------------------------
  // TEST 2 — Authenticated non-admin (403 Forbidden)
  // -------------------------------------------------------------
  console.log("\nTEST 2: Authenticated non-admin request rejected");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments", { session: userSession });
    const res = await listHandler(req);
    const body = await res.json();

    assert(res.status === 403, `List endpoint returned 403 Forbidden (got ${res.status})`);
    assert(body.error && body.error.includes("Forbidden"), "List error message indicates forbidden");

    const detailReq = createMockRequest("http://localhost:3000/api/admin/assessments/assess-uuid-001", { session: userSession });
    const detailRes = await detailHandler(detailReq, { params: Promise.resolve({ id: "assess-uuid-001" }) });
    const detailBody = await detailRes.json();

    assert(detailRes.status === 403, `Detail endpoint returned 403 Forbidden (got ${detailRes.status})`);
    assert(detailBody.error && detailBody.error.includes("Forbidden"), "Detail error message indicates forbidden");
  }

  // -------------------------------------------------------------
  // TEST 3 — Authorized admin list request (200 OK)
  // -------------------------------------------------------------
  console.log("\nTEST 3: Authorized admin list request succeeds");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments", { session: adminSession });
    const res = await listHandler(req);
    const body = await res.json();

    assert(res.status === 200, `List endpoint returned 200 OK (got ${res.status})`);
    assert(body.success === true, "Response payload contains success: true");
    assert(Array.isArray(body.data), "Response contains data array");
    assert(body.data.length === 2, `Returned 2 assessments (got ${body.data.length})`);
    assert(Boolean(body.pagination), "Response contains pagination metadata");
    assert(body.pagination.totalCount === 2, "Pagination totalCount is 2");

    // Check ML alias route
    const mlReq = createMockRequest("http://localhost:3000/api/admin/ml/assessments", { session: adminSession });
    const mlRes = await mlListHandler(mlReq);
    const mlBody = await mlRes.json();
    assert(mlRes.status === 200, "ML alias /api/admin/ml/assessments returned 200 OK");
    assert(mlBody.data.length === 2, "ML alias returned matching data");
  }

  // -------------------------------------------------------------
  // TEST 4 — Authorized admin detail request (200 OK)
  // -------------------------------------------------------------
  console.log("\nTEST 4: Authorized admin detail request succeeds");
  {
    const req = createMockRequest("http://localhost:3000/api/admin/assessments/assess-uuid-001", { session: adminSession });
    const res = await detailHandler(req, { params: Promise.resolve({ id: "assess-uuid-001" }) });
    const body = await res.json();

    assert(res.status === 200, `Detail endpoint returned 200 OK (got ${res.status})`);
    assert(body.success === true, "Detail payload contains success: true");
    assert(body.data.id === "assess-uuid-001", "Returned correct assessment ID");
    assert(body.data.viability_score === 82, "Returned correct viability score (82)");
    assert(body.data.risk_probability === 0.185, "Returned correct risk probability (0.185)");
    assert(body.data.risk_level === "LOW RISK", "Returned correct risk level (LOW RISK)");
    assert(body.data.campaign && body.data.campaign.name === "Clean Water for All", "Attached campaign details");
    assert(Array.isArray(body.data.top_risk_factors), "Returned top_risk_factors array");
    assert(Array.isArray(body.data.top_supporting_factors), "Returned top_supporting_factors array");

    // Check ML alias route
    const mlDetailReq = createMockRequest("http://localhost:3000/api/admin/ml/assessments/assess-uuid-001", { session: adminSession });
    const mlDetailRes = await mlDetailHandler(mlDetailReq, { params: Promise.resolve({ id: "assess-uuid-001" }) });
    const mlDetailBody = await mlDetailRes.json();
    assert(mlDetailRes.status === 200, "ML alias /api/admin/ml/assessments/[id] returned 200 OK");
    assert(mlDetailBody.data.id === "assess-uuid-001", "ML alias returned matching detail data");
  }

  // -------------------------------------------------------------
  // TEST 5 — Invalid assessment ID & missing assessment
  // -------------------------------------------------------------
  console.log("\nTEST 5: Invalid ID & missing assessment handling");
  {
    // Non-existent ID
    const notFoundReq = createMockRequest("http://localhost:3000/api/admin/assessments/non-existent-uuid", { session: adminSession });
    const notFoundRes = await detailHandler(notFoundReq, { params: Promise.resolve({ id: "non-existent-uuid" }) });
    const notFoundBody = await notFoundRes.json();

    assert(notFoundRes.status === 404, `Missing assessment returned 404 Not Found (got ${notFoundRes.status})`);
    assert(notFoundBody.error && notFoundBody.error.includes("not found"), "Error indicates not found");

    // Empty ID
    const emptyReq = createMockRequest("http://localhost:3000/api/admin/assessments/", { session: adminSession });
    const emptyRes = await detailHandler(emptyReq, { params: Promise.resolve({ id: "   " }) });
    const emptyBody = await emptyRes.json();

    assert(emptyRes.status === 400, `Empty assessment ID returned 400 Bad Request (got ${emptyRes.status})`);
    assert(emptyBody.error && emptyBody.error.includes("Invalid assessment ID"), "Error indicates invalid ID");
  }

  // -------------------------------------------------------------
  // TEST 6 — Unsupported query parameter/value validation
  // -------------------------------------------------------------
  console.log("\nTEST 6: Invalid query parameter validation");
  {
    // Invalid page
    const badPageReq = createMockRequest("http://localhost:3000/api/admin/assessments?page=-5", { session: adminSession });
    const badPageRes = await listHandler(badPageReq);
    assert(badPageRes.status === 400, "Rejected negative page with 400 Bad Request");

    const nonNumPageReq = createMockRequest("http://localhost:3000/api/admin/assessments?page=abc", { session: adminSession });
    const nonNumPageRes = await listHandler(nonNumPageReq);
    assert(nonNumPageRes.status === 400, "Rejected non-numeric page with 400 Bad Request");

    // Invalid pageSize
    const badSizeReq = createMockRequest("http://localhost:3000/api/admin/assessments?pageSize=500", { session: adminSession });
    const badSizeRes = await listHandler(badSizeReq);
    assert(badSizeRes.status === 400, "Rejected excessive pageSize (>100) with 400 Bad Request");

    // Invalid riskLevel
    const badRiskReq = createMockRequest("http://localhost:3000/api/admin/assessments?riskLevel=EXTREME_DANGER", { session: adminSession });
    const badRiskRes = await listHandler(badRiskReq);
    assert(badRiskRes.status === 400, "Rejected unallowlisted riskLevel with 400 Bad Request");

    // Invalid assessmentType
    const badTypeReq = createMockRequest("http://localhost:3000/api/admin/assessments?assessmentType=unknown_type", { session: adminSession });
    const badTypeRes = await listHandler(badTypeReq);
    assert(badTypeRes.status === 400, "Rejected unallowlisted assessmentType with 400 Bad Request");

    // Invalid sortOrder
    const badOrderReq = createMockRequest("http://localhost:3000/api/admin/assessments?sortOrder=random", { session: adminSession });
    const badOrderRes = await listHandler(badOrderReq);
    assert(badOrderRes.status === 400, "Rejected unallowlisted sortOrder with 400 Bad Request");
  }

  // -------------------------------------------------------------
  // TEST 7 — Pagination verification
  // -------------------------------------------------------------
  console.log("\nTEST 7: Server-side pagination verification");
  {
    const reqPage1 = createMockRequest("http://localhost:3000/api/admin/assessments?page=1&pageSize=4", {
      session: adminSession,
      assessments: MOCK_PAGINATION_ASSESSMENTS,
    });
    const resPage1 = await listHandler(reqPage1);
    const bodyPage1 = await resPage1.json();

    assert(bodyPage1.data.length === 4, `Page 1 returned exactly 4 items (got ${bodyPage1.data.length})`);
    assert(bodyPage1.pagination.totalCount === 12, `totalCount is 12 (got ${bodyPage1.pagination.totalCount})`);
    assert(bodyPage1.pagination.totalPages === 3, `totalPages is 3 (got ${bodyPage1.pagination.totalPages})`);
    assert(bodyPage1.pagination.hasNextPage === true, "hasNextPage is true on page 1");
    assert(bodyPage1.pagination.hasPreviousPage === false, "hasPreviousPage is false on page 1");

    const reqPage2 = createMockRequest("http://localhost:3000/api/admin/assessments?page=2&pageSize=4", {
      session: adminSession,
      assessments: MOCK_PAGINATION_ASSESSMENTS,
    });
    const resPage2 = await listHandler(reqPage2);
    const bodyPage2 = await resPage2.json();

    assert(bodyPage2.data.length === 4, `Page 2 returned exactly 4 items (got ${bodyPage2.data.length})`);
    assert(bodyPage2.data[0].id !== bodyPage1.data[0].id, "Page 2 contains distinct records from Page 1");
    assert(bodyPage2.pagination.hasNextPage === true, "hasNextPage is true on page 2");
    assert(bodyPage2.pagination.hasPreviousPage === true, "hasPreviousPage is true on page 2");
  }

  // -------------------------------------------------------------
  // TEST 8 — Sensitive data check
  // -------------------------------------------------------------
  console.log("\nTEST 8: Sensitive data audit on JSON responses");
  {
    const listReq = createMockRequest("http://localhost:3000/api/admin/assessments", { session: adminSession });
    const listRes = await listHandler(listReq);
    const listRaw = await listRes.text();

    assert(!listRaw.includes("stripe"), "No Stripe tokens or secrets in list JSON");
    assert(!listRaw.includes("password"), "No password or auth secrets in list JSON");
    assert(!listRaw.includes("service_role"), "No service-role credentials in list JSON");
    assert(!listRaw.includes("ML_API_URL"), "ML_API_URL not exposed in list JSON");
    assert(!listRaw.includes("user_charity_selections"), "No donor selections table data exposed in list JSON");

    const detailReq = createMockRequest("http://localhost:3000/api/admin/assessments/assess-uuid-001", { session: adminSession });
    const detailRes = await detailHandler(detailReq, { params: Promise.resolve({ id: "assess-uuid-001" }) });
    const detailRaw = await detailRes.text();

    assert(!detailRaw.includes("stripe"), "No Stripe tokens or secrets in detail JSON");
    assert(!detailRaw.includes("password"), "No password or auth secrets in detail JSON");
    assert(!detailRaw.includes("service_role"), "No service-role credentials in detail JSON");
    assert(!detailRaw.includes("ML_API_URL"), "ML_API_URL not exposed in detail JSON");
    assert(!detailRaw.includes("user_charity_selections"), "No donor selections table data exposed in detail JSON");
    assert(!detailRaw.includes("user_id"), "No user_id fields exposed in detail JSON");

    // Cache-Control header check
    assert(
      listRes.headers.get("Cache-Control") === "no-store, max-age=0, must-revalidate",
      "Cache-Control: no-store, max-age=0, must-revalidate header set on list response"
    );
    assert(
      detailRes.headers.get("Cache-Control") === "no-store, max-age=0, must-revalidate",
      "Cache-Control: no-store, max-age=0, must-revalidate header set on detail response"
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

runAllApiTests().catch((err) => {
  console.error("Fatal API test error:", err);
  process.exit(1);
});
