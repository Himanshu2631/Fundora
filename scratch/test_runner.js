/**
 * Phase 4.3 Step 3 - Assessment Runner Unit Tests
 *
 * Tests runCampaignViabilityAssessment() across all required cases:
 *   TEST 1 - Eligible campaign -> ML -> storage -> success
 *   TEST 2 - Campaign below 48 hours -> skip (FastAPI NOT called)
 *   TEST 3 - Campaign already assessed -> skip (FastAPI NOT called)
 *   TEST 4 - FastAPI unavailable -> controlled failure (no DB row)
 *   TEST 5 - Successful assessment fields verified
 *   TEST 6 - Repeat execution idempotency (no duplicate assessment)
 *
 * Uses in-memory mock Supabase client following the same pattern as
 * test_phase4_2_e2e.js - no real Supabase or FastAPI calls except
 * where TEST 1, 4, and 6 intentionally hit the live FastAPI.
 *
 * Run: node --experimental-vm-modules scratch/test_runner.js
 */

import { runCampaignViabilityAssessment } from "../lib/ml/assessmentRunner.js";

// ============================================================
// SHARED TEST FIXTURE
// ============================================================

const LAUNCH_ISO = "2026-09-01T10:00:00.000Z";
const LAUNCH_MS = new Date(LAUNCH_ISO).getTime();

// A campaign that launched > 48 hours ago (for eligibility tests)
const CAMPAIGN_ELIGIBLE = {
  id: "CH-RUNNER-01",
  name: "Acres of Green",
  description:
    "Dedicated to restoring local woodland ecosystems, planting native broadleaf species, " +
    "and protecting wildlife corridors from commercial fragmentation.",
  why_matters:
    "Healthy woodlands act as natural carbon sinks, buffer regional temperature rises, " +
    "regulate hydrological cycles, and preserve native biodiversity.",
  image_url: "/acres_of_green.png",
  category: "Environment",
  impact: "7,400+ hectares of ancient forests protected this quarter.",
  created_at: LAUNCH_ISO,
  updated_at: LAUNCH_ISO,
};

// Reference time clearly past 48 hours after launch
const NOW_PAST_48H = new Date(LAUNCH_MS + 50 * 3600 * 1000).toISOString();

// Reference time only 24 hours after launch (NOT yet eligible)
const NOW_ONLY_24H = new Date(LAUNCH_MS + 24 * 3600 * 1000).toISOString();

const ALLOCATIONS = [
  {
    id: "sel-1",
    charity_id: "CH-RUNNER-01",
    contribution_percentage: 20,
    created_at: new Date(LAUNCH_MS + 3600 * 1000).toISOString(),    // 1h (within 48h)
  },
  {
    id: "sel-2",
    charity_id: "CH-RUNNER-01",
    contribution_percentage: 30,
    created_at: new Date(LAUNCH_MS + 72000 * 1000).toISOString(),   // 20h (within 48h)
  },
  {
    id: "sel-3",
    charity_id: "CH-RUNNER-01",
    contribution_percentage: 40,
    created_at: new Date(LAUNCH_MS + 250000 * 1000).toISOString(),  // 69.4h (post-48h -> must be excluded)
  },
];

/**
 * Creates an in-memory mock Supabase client for the runner tests.
 *
 * @param {Object} opts
 * @param {Object|null} opts.campaign - Campaign record to return (null = not found)
 * @param {boolean} opts.hasExistingAssessment - Simulate existing initial_48h assessment
 * @param {boolean} opts.failInsert - Simulate DB insert failure
 * @param {string} opts.insertFailMessage - Custom insert failure message
 */
function createMockClient({
  campaign = CAMPAIGN_ELIGIBLE,
  hasExistingAssessment = false,
  failInsert = false,
  insertFailMessage = "Database connection failed",
} = {}) {
  const storedAssessments = [];
  let fastApiCallCount = 0;

  // We intercept predictCampaignViability calls by patching process.env.ML_API_URL
  // in individual tests rather than here, since fastapi.js reads from process.env.

  const client = {
    getStoredAssessments: () => [...storedAssessments],
    getStoredCount: () => storedAssessments.length,

    from: (table) => {
      // ------------------------------------------------------------------
      // charities table (campaign lookup by runner + payload mapper)
      // ------------------------------------------------------------------
      if (table === "charities") {
        return {
          select: () => ({
            eq: (field, val) => ({
              maybeSingle: async () => ({
                data:
                  campaign && val === campaign.id ? { ...campaign } : null,
                error: null,
              }),
            }),
          }),
        };
      }

      // ------------------------------------------------------------------
      // user_charity_selections table (payload mapper donations)
      // ------------------------------------------------------------------
      if (table === "user_charity_selections") {
        return {
          select: () => ({
            eq: (field, val) => ({
              data: ALLOCATIONS.filter((a) => a.charity_id === val),
              error: null,
            }),
          }),
        };
      }

      // ------------------------------------------------------------------
      // campaign_viability_assessments table
      //   - SELECT: eligibility check for existing initial_48h
      //   - INSERT: assessment storage
      // ------------------------------------------------------------------
      if (table === "campaign_viability_assessments") {
        return {
          // SELECT chain used by isCampaignViabilityAssessmentEligible
          select: (cols) => ({
            eq: (f1, v1) => ({
              eq: (f2, v2) => ({
                limit: () =>
                  Promise.resolve({
                    data: hasExistingAssessment
                      ? [{ id: "existing-assess-uuid", assessment_type: "initial_48h" }]
                      : [],
                    error: null,
                  }),
              }),
            }),
          }),

          // INSERT chain used by storeViabilityAssessment
          insert: (record) => {
            if (failInsert) {
              return {
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: { message: insertFailMessage },
                  }),
                }),
              };
            }
            const created = {
              id: "assess-uuid-" + (storedAssessments.length + 1),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...record,
            };
            storedAssessments.push(created);
            return {
              select: () => ({
                single: async () => ({ data: created, error: null }),
              }),
            };
          },
        };
      }

      return {
        select: () => ({ eq: () => ({ data: [], error: null }) }),
      };
    },
  };

  return client;
}

// ============================================================
// HELPER
// ============================================================

function pass(label) {
  console.log("  [PASS]", label);
}
function fail(label, detail) {
  console.log("  [FAIL]", label, detail !== undefined ? `-> ${detail}` : "");
}
function check(condition, label, detail) {
  if (condition) pass(label);
  else fail(label, detail);
  return condition;
}

// ============================================================
// TESTS
// ============================================================

async function runTests() {
  console.log("==================================================");
  console.log("PHASE 4.3 STEP 3: ASSESSMENT RUNNER UNIT TESTS");
  console.log("==================================================");

  let allPassed = true;

  // ────────────────────────────────────────────────────────────
  // TEST 1: Eligible campaign -> ML -> storage -> success
  // ────────────────────────────────────────────────────────────
  console.log("\n[TEST 1] Eligible campaign - full pipeline");
  process.env.ML_API_URL = "http://127.0.0.1:8000";
  const db1 = createMockClient({ hasExistingAssessment: false });

  const res1 = await runCampaignViabilityAssessment("CH-RUNNER-01", {
    supabaseClient: db1,
    now: NOW_PAST_48H,
    targetGoal: 10000.0,
    country: "US",
  });

  const t1a = check(res1.success === true, "result.success === true", res1.success);
  const t1b = check(res1.skipped === false, "result.skipped === false", res1.skipped);
  const t1c = check(res1.campaignId === "CH-RUNNER-01", "result.campaignId correct", res1.campaignId);
  const t1d = check(typeof res1.assessmentId === "string" && res1.assessmentId.length > 0, "assessmentId returned", res1.assessmentId);
  const t1e = check(res1.assessment !== null && typeof res1.assessment === "object", "assessment payload present");
  const t1f = check(db1.getStoredCount() === 1, "exactly 1 assessment stored", db1.getStoredCount());
  const t1_pass = t1a && t1b && t1c && t1d && t1e && t1f;
  console.log("  TEST 1 STATUS:", t1_pass ? "PASS" : "FAIL");
  allPassed = allPassed && t1_pass;

  // ────────────────────────────────────────────────────────────
  // TEST 2: Campaign below 48 hours -> skip
  // ────────────────────────────────────────────────────────────
  console.log("\n[TEST 2] Campaign below 48 hours - expect skip");
  const db2 = createMockClient({ hasExistingAssessment: false });

  const res2 = await runCampaignViabilityAssessment("CH-RUNNER-01", {
    supabaseClient: db2,
    now: NOW_ONLY_24H,  // Only 24h elapsed - NOT eligible
  });

  const t2a = check(res2.success === true, "result.success === true", res2.success);
  const t2b = check(res2.skipped === true, "result.skipped === true", res2.skipped);
  const t2c = check(typeof res2.reason === "string" && res2.reason.length > 0, "skip reason provided", res2.reason);
  const t2d = check(db2.getStoredCount() === 0, "zero assessments stored (FastAPI not called)", db2.getStoredCount());
  const t2e = check(res2.assessmentId === undefined, "no assessmentId in skip result");
  const t2_pass = t2a && t2b && t2c && t2d && t2e;
  console.log("  Reason:", res2.reason);
  console.log("  TEST 2 STATUS:", t2_pass ? "PASS" : "FAIL");
  allPassed = allPassed && t2_pass;

  // ────────────────────────────────────────────────────────────
  // TEST 3: Campaign already assessed -> skip (no FastAPI call)
  // ────────────────────────────────────────────────────────────
  console.log("\n[TEST 3] Campaign already assessed - expect skip");
  const db3 = createMockClient({ hasExistingAssessment: true });  // pre-existing assessment

  const res3 = await runCampaignViabilityAssessment("CH-RUNNER-01", {
    supabaseClient: db3,
    now: NOW_PAST_48H,
  });

  const t3a = check(res3.success === true, "result.success === true", res3.success);
  const t3b = check(res3.skipped === true, "result.skipped === true", res3.skipped);
  const t3c = check(typeof res3.reason === "string" && res3.reason.toLowerCase().includes("already"), "reason indicates already assessed", res3.reason);
  const t3d = check(db3.getStoredCount() === 0, "zero new assessments stored", db3.getStoredCount());
  const t3_pass = t3a && t3b && t3c && t3d;
  console.log("  Reason:", res3.reason);
  console.log("  TEST 3 STATUS:", t3_pass ? "PASS" : "FAIL");
  allPassed = allPassed && t3_pass;

  // ────────────────────────────────────────────────────────────
  // TEST 4: FastAPI unavailable -> controlled failure, no DB row
  // ────────────────────────────────────────────────────────────
  console.log("\n[TEST 4] FastAPI unavailable - expect controlled failure");
  process.env.ML_API_URL = "http://127.0.0.1:9999";  // Offline port
  const db4 = createMockClient({ hasExistingAssessment: false });

  const res4 = await runCampaignViabilityAssessment("CH-RUNNER-01", {
    supabaseClient: db4,
    now: NOW_PAST_48H,
  });

  process.env.ML_API_URL = "http://127.0.0.1:8000";  // Restore

  const t4a = check(res4.success === false, "result.success === false", res4.success);
  const t4b = check(res4.skipped === false, "result.skipped === false", res4.skipped);
  const t4c = check(typeof res4.reason === "string" && res4.reason.length > 0, "failure reason provided", res4.reason);
  const t4d = check(db4.getStoredCount() === 0, "zero DB rows created during ML outage", db4.getStoredCount());
  // No internal secrets in reason
  const t4e = check(
    !res4.reason.includes("ML_API_URL") && !res4.reason.includes("supabase"),
    "no internal secrets exposed in reason", res4.reason
  );
  const t4_pass = t4a && t4b && t4c && t4d && t4e;
  console.log("  Reason:", res4.reason);
  console.log("  TEST 4 STATUS:", t4_pass ? "PASS" : "FAIL");
  allPassed = allPassed && t4_pass;

  // ────────────────────────────────────────────────────────────
  // TEST 5: Successful assessment - field verification
  // ────────────────────────────────────────────────────────────
  console.log("\n[TEST 5] Successful assessment - field verification");
  process.env.ML_API_URL = "http://127.0.0.1:8000";
  const db5 = createMockClient({ hasExistingAssessment: false });

  const res5 = await runCampaignViabilityAssessment("CH-RUNNER-01", {
    supabaseClient: db5,
    now: NOW_PAST_48H,
    targetGoal: 10000.0,
    country: "US",
  });

  const storedRow = db5.getStoredAssessments()[0];
  const t5a = check(res5.success === true, "result.success === true");
  const t5b = check(res5.campaignId === "CH-RUNNER-01", "campaignId correct");
  const t5c = check(
    storedRow && storedRow.campaign_id === "CH-RUNNER-01",
    "stored row campaign_id correct",
    storedRow?.campaign_id
  );
  const t5d = check(
    storedRow && storedRow.assessment_type === "initial_48h",
    "stored assessment_type is initial_48h",
    storedRow?.assessment_type
  );
  const t5e = check(
    res5.assessment && typeof res5.assessment.risk_probability === "number",
    "assessment.risk_probability is number",
    res5.assessment?.risk_probability
  );
  const t5f = check(
    res5.assessment && typeof res5.assessment.viability_score === "number",
    "assessment.viability_score is number",
    res5.assessment?.viability_score
  );
  const t5g = check(
    res5.assessmentId === storedRow?.id,
    "returned assessmentId matches stored row id",
    `${res5.assessmentId} vs ${storedRow?.id}`
  );
  // 48-hour boundary: no raised field in assessment
  const t5h = check(
    res5.assessment?.raised === undefined,
    "no 'raised' field leaked into assessment payload"
  );
  const t5_pass = t5a && t5b && t5c && t5d && t5e && t5f && t5g && t5h;
  console.log("  Assessment ID:", res5.assessmentId);
  console.log("  Risk Level:", res5.assessment?.risk_level);
  console.log("  Score:", res5.assessment?.viability_score);
  console.log("  TEST 5 STATUS:", t5_pass ? "PASS" : "FAIL");
  allPassed = allPassed && t5_pass;

  // ────────────────────────────────────────────────────────────
  // TEST 6: Repeat execution - idempotency (no duplicate)
  // ────────────────────────────────────────────────────────────
  console.log("\n[TEST 6] Repeat execution - idempotency check");
  process.env.ML_API_URL = "http://127.0.0.1:8000";

  // Use a client that tracks stored assessments and reflects them in SELECT
  // (simulates the DB state after the first insertion)
  let alreadyInserted = false;
  const storedAssessments6 = [];

  const db6 = {
    getStoredCount: () => storedAssessments6.length,
    from: (table) => {
      if (table === "charities") {
        return {
          select: () => ({
            eq: (f, v) => ({
              maybeSingle: async () => ({
                data: v === CAMPAIGN_ELIGIBLE.id ? { ...CAMPAIGN_ELIGIBLE } : null,
                error: null,
              }),
            }),
          }),
        };
      }
      if (table === "user_charity_selections") {
        return {
          select: () => ({
            eq: (f, v) => ({
              data: ALLOCATIONS.filter((a) => a.charity_id === v),
              error: null,
            }),
          }),
        };
      }
      if (table === "campaign_viability_assessments") {
        return {
          select: () => ({
            eq: (f1, v1) => ({
              eq: (f2, v2) => ({
                limit: () =>
                  Promise.resolve({
                    // After first run: return existing assessment in SELECT
                    data: alreadyInserted
                      ? [{ id: "assess-uuid-1", assessment_type: "initial_48h" }]
                      : [],
                    error: null,
                  }),
              }),
            }),
          }),
          insert: (record) => {
            if (alreadyInserted) {
              // Simulate DB unique constraint violation on second insert attempt
              return {
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: {
                      message:
                        "duplicate key value violates unique constraint " +
                        '"idx_unique_campaign_initial_48h_assessment"',
                    },
                  }),
                }),
              };
            }
            const created = {
              id: "assess-uuid-1",
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...record,
            };
            storedAssessments6.push(created);
            alreadyInserted = true;
            return {
              select: () => ({
                single: async () => ({ data: created, error: null }),
              }),
            };
          },
        };
      }
      return { select: () => ({ eq: () => ({ data: [], error: null }) }) };
    },
  };

  // First run - should succeed and store one assessment
  const run6a = await runCampaignViabilityAssessment("CH-RUNNER-01", {
    supabaseClient: db6,
    now: NOW_PAST_48H,
  });

  // Second run - should detect existing assessment and skip
  const run6b = await runCampaignViabilityAssessment("CH-RUNNER-01", {
    supabaseClient: db6,
    now: NOW_PAST_48H,
  });

  const t6a = check(run6a.success === true && run6a.skipped === false, "first run: success and not skipped", `success=${run6a.success} skipped=${run6a.skipped}`);
  const t6b = check(run6b.success === true && run6b.skipped === true, "second run: success and skipped", `success=${run6b.success} skipped=${run6b.skipped}`);
  const t6c = check(db6.getStoredCount() === 1, "exactly 1 assessment stored total", db6.getStoredCount());
  const t6d = check(
    typeof run6b.reason === "string" && run6b.reason.length > 0,
    "second run skip reason provided", run6b.reason
  );
  const t6_pass = t6a && t6b && t6c && t6d;
  console.log("  Run 1 -> success:", run6a.success, "skipped:", run6a.skipped, "assessmentId:", run6a.assessmentId);
  console.log("  Run 2 -> success:", run6b.success, "skipped:", run6b.skipped, "reason:", run6b.reason);
  console.log("  Total stored assessments:", db6.getStoredCount());
  console.log("  TEST 6 STATUS:", t6_pass ? "PASS" : "FAIL");
  allPassed = allPassed && t6_pass;

  // ────────────────────────────────────────────────────────────
  // SUMMARY
  // ────────────────────────────────────────────────────────────
  console.log("\n==================================================");
  console.log("PHASE 4.3 STEP 3 TEST SUMMARY:", allPassed ? "ALL PASS" : "SOME FAILED");
  console.log("==================================================");
}

runTests().catch(console.error);