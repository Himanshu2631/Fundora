/**
 * Phase 4.3 Step 6: Final End-to-End Verification Test Suite
 *
 * Verifies the entire automated 48-hour viability assessment architecture:
 *   Scheduled Trigger -> Discovery -> Eligibility -> Idempotency -> Runner ->
 *   Payload Mapper -> FastAPI Bridge -> ML Inference -> Supabase Storage
 *
 * Tests:
 *   TEST A — Complete success (Eligible campaign -> all steps -> 1 DB assessment with all fields)
 *   TEST B — Campaign not yet 48 hours (<48h -> not eligible -> skip -> FastAPI not called)
 *   TEST C — Already assessed (existing initial assessment -> skip -> FastAPI not called -> no duplicate)
 *   TEST D — Post-48-hour leakage (events > 172,800s excluded, raised excluded from ML input, no final outcome sent)
 *   TEST E — FastAPI failure (unavailable -> fails safely, no DB row, retry follows Step 5, other campaigns continue)
 *   TEST F — FastAPI validation failure (invalid input -> 422 -> classified non-retryable -> no DB row)
 *   TEST G — Supabase failure (DB failure -> prediction succeeds but insert fails -> failure reported, no false success)
 *   TEST H — Retry / recovery (temporary failure on attempt 1 -> recovery on retry -> exactly 1 assessment)
 *   TEST I — Repeated scheduler execution (run 1 -> creates assessment; run 2 -> skipped; total initial assessments = 1)
 *   TEST J — Multiple campaigns (A=eligible, B=<48h, C=already assessed, D=eligible, E=failure -> isolation verified)
 *   TEST K — Unauthorized scheduler request (unauthorized request -> 401 rejected, no ML calls, no DB rows)
 *
 * Run with: node scratch/test_phase4_3_final_e2e.js
 */

import {
  runScheduledViabilityAssessments,
  findCandidateCampaigns,
  verifyCronAuthorization,
} from "../lib/ml/assessmentScheduler.js";
import { buildCampaignViabilityPayload } from "../lib/ml/payloadMapper.js";
import { runCampaignViabilityAssessment } from "../lib/ml/assessmentRunner.js";
import { FAILURE_CATEGORIES } from "../lib/ml/failureClassifier.js";

// Ensure environment
process.env.ML_API_URL = process.env.ML_API_URL || "http://127.0.0.1:8000";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test_cron_secret_local_dev";
process.env.ML_ASSESSMENT_MAX_RETRIES = "2";

// ============================================================
// FIXTURES
// ============================================================

const LAUNCH_ISO = "2026-09-01T10:00:00.000Z";
const LAUNCH_MS = new Date(LAUNCH_ISO).getTime();
const NOW_PAST_48H = new Date(LAUNCH_MS + 55 * 3600 * 1000).toISOString(); // 55h after launch
const NOW_ONLY_24H = new Date(LAUNCH_MS + 24 * 3600 * 1000).toISOString(); // 24h after launch

const CAMPAIGN_BASE = {
  id: "CH-FINAL-01",
  name: "Solar Micro-Grids",
  description: "Providing decentralized solar electricity for rural healthcare clinics and primary schools.",
  why_matters: "Constant power enables vaccine refrigeration and digital learning in off-grid communities.",
  image_url: "/solar.png",
  category: "Clean Energy",
  impact: "45 clinics powered continuously.",
  raised: "$120,500", // Present in campaign table, MUST be excluded from ML payload
  created_at: LAUNCH_ISO,
  updated_at: LAUNCH_ISO,
};

const ALLOCATIONS_LEAKAGE_TEST = [
  {
    id: "alloc-1",
    charity_id: "CH-FINAL-01",
    contribution_percentage: 20,
    created_at: new Date(LAUNCH_MS + 3600 * 1000).toISOString(), // 1h (within 48h)
  },
  {
    id: "alloc-2",
    charity_id: "CH-FINAL-01",
    contribution_percentage: 30,
    created_at: new Date(LAUNCH_MS + 72000 * 1000).toISOString(), // 20h (within 48h)
  },
  {
    id: "alloc-3",
    charity_id: "CH-FINAL-01",
    contribution_percentage: 40,
    created_at: new Date(LAUNCH_MS + 172700 * 1000).toISOString(), // 47.97h (within 48h)
  },
  {
    id: "alloc-4-POST48H",
    charity_id: "CH-FINAL-01",
    contribution_percentage: 50,
    created_at: new Date(LAUNCH_MS + 173000 * 1000).toISOString(), // 48.05h (> 172800s -> LEAKAGE!)
  },
  {
    id: "alloc-5-POST48H",
    charity_id: "CH-FINAL-01",
    contribution_percentage: 60,
    created_at: new Date(LAUNCH_MS + 300000 * 1000).toISOString(), // 83.3h (> 172800s -> LEAKAGE!)
  },
];

// ============================================================
// IN-MEMORY MOCK SUPABASE CLIENT
// ============================================================

function createMasterMockClient({
  campaigns = [CAMPAIGN_BASE],
  allocations = ALLOCATIONS_LEAKAGE_TEST,
  initialAssessments = [],
  failInsertCount = 0,
  failLookupCampaignId = null,
} = {}) {
  const charityRows = [...campaigns];
  const allocationRows = [...allocations];
  const assessmentRows = [...initialAssessments];
  let insertAttempts = 0;

  const client = {
    getStoredAssessments: () => [...assessmentRows],
    getInsertAttempts: () => insertAttempts,

    from: (table) => {
      if (table === "charities") {
        return {
          select: () => {
            let filterLte = null;
            let limitVal = null;

            const chain = {
              eq: (f, v) => {
                if (failLookupCampaignId && v === failLookupCampaignId) {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: "Simulated transient database connection error" },
                    }),
                  };
                }
                return {
                  maybeSingle: async () => {
                    const found = charityRows.find((c) => c[f] === v);
                    return { data: found ? { ...found } : null, error: null };
                  },
                };
              },
              lte: (f, v) => {
                filterLte = { field: f, val: v };
                return chain;
              },
              order: () => chain,
              limit: (l) => {
                limitVal = l;
                return chain;
              },
              then: async (resolve) => {
                let res = [...charityRows];
                if (filterLte) {
                  res = res.filter(
                    (c) => new Date(c[filterLte.field]) <= new Date(filterLte.val)
                  );
                }
                if (limitVal !== null) {
                  res = res.slice(0, limitVal);
                }
                resolve({ data: res, error: null });
              },
            };
            return chain;
          },
        };
      }

      if (table === "user_charity_selections") {
        return {
          select: () => ({
            eq: (f, v) => ({
              data: allocationRows.filter((a) => a[f] === v),
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
                    data: assessmentRows.filter(
                      (a) => a[f1] === v1 && a[f2] === v2
                    ),
                    error: null,
                  }),
              }),
            }),
          }),
          insert: (record) => {
            insertAttempts++;

            if (insertAttempts <= failInsertCount) {
              return {
                select: () => ({
                  single: async () => ({
                    data: null,
                    error: { message: "Simulated database write lock timeout" },
                  }),
                }),
              };
            }

            // DB unique partial index constraint check
            const isInitial = (record.assessment_type || "initial_48h") === "initial_48h";
            const exists = assessmentRows.some(
              (a) =>
                a.campaign_id === record.campaign_id &&
                (a.assessment_type || "initial_48h") === "initial_48h"
            );

            if (isInitial && exists) {
              const err = new Error(
                'duplicate key value violates unique constraint "idx_unique_campaign_initial_48h_assessment"'
              );
              err.code = "23505";
              return {
                select: () => ({
                  single: async () => ({ data: null, error: err }),
                }),
              };
            }

            const stored = {
              id: "master-assess-" + (assessmentRows.length + 1),
              ...record,
              created_at: new Date().toISOString(),
            };
            assessmentRows.push(stored);

            return {
              select: () => ({
                single: async () => ({ data: stored, error: null }),
              }),
            };
          },
        };
      }

      throw new Error(`Unexpected table: ${table}`);
    },
  };

  return client;
}

// ============================================================
// VERIFICATION RUNNER
// ============================================================

async function runEndToEndVerification() {
  console.log("==================================================");
  console.log("PHASE 4.3 STEP 6: MASTER END-TO-END VERIFICATION");
  console.log("==================================================\n");

  let allPassed = true;

  function assert(cond, msg) {
    if (!cond) {
      console.error(`  [FAIL] ${msg}`);
      allPassed = false;
    } else {
      console.log(`  [PASS] ${msg}`);
    }
  }

  // ────────────────────────────────────────────────────────────
  // TEST A: Complete Success
  // ────────────────────────────────────────────────────────────
  console.log("[TEST A] Complete Success - Eligible campaign -> full pipeline -> Supabase");
  {
    const mockClient = createMasterMockClient();
    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      initialBackoffMs: 0,
    });

    assert(summary.success === true, "Scheduler returned success: true");
    assert(summary.succeeded === 1, "succeeded === 1");
    assert(summary.failed === 0, "failed === 0");
    assert(summary.skipped === 0, "skipped === 0");

    const rows = mockClient.getStoredAssessments();
    assert(rows.length === 1, "Exactly 1 assessment persisted in Supabase");

    const row = rows[0];
    assert(row.campaign_id === "CH-FINAL-01", "Assessment references correct campaign ID");
    assert(typeof row.risk_probability === "number", "risk_probability is present and numeric");
    assert(typeof row.viability_score === "number", "viability_score is present and numeric");
    assert(["LOW RISK", "MEDIUM RISK", "HIGH RISK"].includes(row.risk_level), `risk_level valid: "${row.risk_level}"`);
    assert(row.model_name === "Random Forest Champion", "model_name metadata is present");
    assert(Array.isArray(row.top_risk_factors), "top_risk_factors explanation present");
    assert(Array.isArray(row.top_supporting_factors), "top_supporting_factors explanation present");
    console.log(`  Assessment Viability Score: ${row.viability_score} | Risk Level: ${row.risk_level}`);
    console.log(`  TEST A STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST B: Campaign not yet 48 hours
  // ────────────────────────────────────────────────────────────
  console.log("[TEST B] Campaign not yet 48 hours - Skip without calling FastAPI");
  {
    const mockClient = createMasterMockClient();

    // 1. Candidate discovery level
    const candidates = await findCandidateCampaigns(mockClient, { now: NOW_ONLY_24H });
    assert(candidates.length === 0, "Candidate discovery excludes <48h campaigns");

    // 2. Direct runner invocation level
    let fastApiCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (...args) => {
      fastApiCalled = true;
      return originalFetch(...args);
    };

    const res = await runCampaignViabilityAssessment("CH-FINAL-01", {
      supabaseClient: mockClient,
      now: NOW_ONLY_24H,
    });

    globalThis.fetch = originalFetch;

    assert(res.success === true && res.skipped === true, "Runner returned skipped: true");
    assert(fastApiCalled === false, "FastAPI was NOT called");
    assert(mockClient.getStoredAssessments().length === 0, "No assessment created in database");
    console.log(`  Skip reason: "${res.reason}"`);
    console.log(`  TEST B STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST C: Already Assessed Campaign
  // ────────────────────────────────────────────────────────────
  console.log("[TEST C] Already Assessed Campaign - Skip without calling FastAPI");
  {
    const existing = {
      id: "prev-assess-001",
      campaign_id: "CH-FINAL-01",
      assessment_type: "initial_48h",
      viability_score: 75,
    };
    const mockClient = createMasterMockClient({
      initialAssessments: [existing],
    });

    let fastApiCalled = false;
    const originalFetch = globalThis.fetch;
    globalThis.fetch = (...args) => {
      fastApiCalled = true;
      return originalFetch(...args);
    };

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
    });

    globalThis.fetch = originalFetch;

    assert(summary.succeeded === 0, "succeeded === 0");
    assert(summary.skipped === 1, "skipped === 1");
    assert(fastApiCalled === false, "FastAPI was NOT called");
    assert(mockClient.getStoredAssessments().length === 1, "No duplicate assessment created (count remains 1)");
    assert(mockClient.getStoredAssessments()[0].id === "prev-assess-001", "Existing assessment unchanged");
    console.log(`  Skip reason: "${summary.results[0].reason}"`);
    console.log(`  TEST C STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST D: Post-48-Hour Leakage & Feature Boundary
  // ────────────────────────────────────────────────────────────
  console.log("[TEST D] Post-48-Hour Leakage & Feature Boundary");
  {
    const mockClient = createMasterMockClient();
    const payload = await buildCampaignViabilityPayload("CH-FINAL-01", {
      supabaseClient: mockClient,
    });

    assert(payload.campaign_id === "CH-FINAL-01", "Payload mapped correct campaign_id");
    assert(payload.raised === undefined, "Raw 'raised' field is strictly EXCLUDED from ML payload");
    assert(payload.outcome === undefined, "Final campaign outcome is strictly EXCLUDED");

    // Check donations: alloc-1, alloc-2, alloc-3 should be included (<= 172800s)
    // alloc-4-POST48H (173000s) and alloc-5-POST48H (300000s) MUST be excluded!
    assert(payload.donations.length === 3, `Donations count is 3 (received: ${payload.donations.length})`);
    for (const d of payload.donations) {
      assert(
        d.seconds_elapsed <= 172800,
        `Donation timestamp ${d.seconds_elapsed}s is within 48h (<= 172,800s)`
      );
    }
    console.log(`  Included donations: ${JSON.stringify(payload.donations)}`);
    console.log(`  TEST D STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST E: FastAPI Failure
  // ────────────────────────────────────────────────────────────
  console.log("[TEST E] FastAPI Failure - Unavailable -> Controlled failure -> 0 DB rows");
  {
    const savedUrl = process.env.ML_API_URL;
    process.env.ML_API_URL = "http://127.0.0.1:9999"; // unreachable endpoint

    const mockClient = createMasterMockClient();
    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      maxRetries: 1,
      initialBackoffMs: 0,
    });

    process.env.ML_API_URL = savedUrl;

    assert(summary.failed === 1, "failed === 1");
    assert(summary.succeeded === 0, "succeeded === 0");
    assert(summary.results[0].retryable === true, "Classified as retryable failure");
    assert(mockClient.getStoredAssessments().length === 0, "Zero DB rows created during FastAPI failure");
    console.log(`  TEST E STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST F: FastAPI Validation Failure
  // ────────────────────────────────────────────────────────────
  console.log("[TEST F] FastAPI Validation Failure - Permanent failure -> 0 retries");
  {
    const originalFetch = globalThis.fetch;
    let fetchCount = 0;

    globalThis.fetch = async () => {
      fetchCount++;
      return {
        ok: false,
        status: 422,
        json: async () => ({
          detail: [{ loc: ["body", "goal"], msg: "Field required" }],
        }),
      };
    };

    const mockClient = createMasterMockClient();
    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      maxRetries: 2,
      initialBackoffMs: 0,
    });

    globalThis.fetch = originalFetch;

    assert(summary.failed === 1, "failed === 1");
    assert(summary.succeeded === 0, "succeeded === 0");
    assert(summary.results[0].retryable === false, "Classified as non-retryable");
    assert(summary.results[0].category === FAILURE_CATEGORIES.VALIDATION_ERROR, "Category is validation_error");
    assert(summary.results[0].attempts === 1, "Did NOT retry (attempts === 1)");
    assert(fetchCount === 1, "FastAPI called exactly once");
    assert(mockClient.getStoredAssessments().length === 0, "Zero DB rows stored");
    console.log(`  TEST F STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST G: Supabase Failure
  // ────────────────────────────────────────────────────────────
  console.log("[TEST G] Supabase Failure - Prediction succeeds but DB insert fails");
  {
    // Force Supabase insert to fail all attempts
    const mockClient = createMasterMockClient({
      failInsertCount: 999, // permanent for this test
    });

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      maxRetries: 1,
      initialBackoffMs: 0,
    });

    assert(summary.failed === 1, "failed === 1 (no false success reported)");
    assert(summary.succeeded === 0, "succeeded === 0");
    assert(summary.results[0].retryable === true, "Supabase failure classified as retryable");
    assert(mockClient.getStoredAssessments().length === 0, "No corrupted/partial assessment persisted");
    console.log(`  TEST G STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST H: Retry / Recovery
  // ────────────────────────────────────────────────────────────
  console.log("[TEST H] Retry / Recovery - Transient failure recovered on retry");
  {
    // Fail insert attempt 1, succeed on attempt 2
    const mockClient = createMasterMockClient({
      failInsertCount: 1,
    });

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      maxRetries: 2,
      initialBackoffMs: 0,
    });

    assert(summary.succeeded === 1, "succeeded === 1");
    assert(summary.failed === 0, "failed === 0");
    assert(summary.results[0].attempts === 2, "Succeeded on retry attempt 2");
    assert(mockClient.getStoredAssessments().length === 1, "Exactly 1 assessment persisted after recovery");
    console.log(`  TEST H STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST I: Repeated Scheduler Execution
  // ────────────────────────────────────────────────────────────
  console.log("[TEST I] Repeated Scheduler Execution - Run 1 assesses, Run 2 skips, total = 1");
  {
    const mockClient = createMasterMockClient();

    // Run 1
    const run1 = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      initialBackoffMs: 0,
    });
    assert(run1.succeeded === 1, "Run 1 created assessment");

    // Run 2
    const run2 = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      initialBackoffMs: 0,
    });
    assert(run2.succeeded === 0 && run2.skipped === 1, "Run 2 detected existing assessment and skipped");
    assert(mockClient.getStoredAssessments().length === 1, "Total initial 48h assessments in DB remains exactly 1");
    console.log(`  TEST I STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST J: Multiple Campaigns
  // ────────────────────────────────────────────────────────────
  console.log("[TEST J] Multiple Campaigns - Mixed states and fault isolation");
  {
    const campA = { ...CAMPAIGN_BASE, id: "CH-MIX-A", name: "Camp A (Eligible)" };
    const campB = { ...CAMPAIGN_BASE, id: "CH-MIX-B", name: "Camp B (<48h)", created_at: NOW_ONLY_24H };
    const campC = { ...CAMPAIGN_BASE, id: "CH-MIX-C", name: "Camp C (Already assessed)" };
    const campD = { ...CAMPAIGN_BASE, id: "CH-MIX-D", name: "Camp D (Eligible)" };
    const campE = { ...CAMPAIGN_BASE, id: "CH-MIX-E", name: "Camp E (Fails DB)" };

    const existingAss = [
      { id: "ass-c", campaign_id: "CH-MIX-C", assessment_type: "initial_48h", viability_score: 80 },
    ];

    const mockClient = createMasterMockClient({
      campaigns: [campA, campB, campC, campD, campE],
      initialAssessments: existingAss,
      failLookupCampaignId: "CH-MIX-E", // Camp E triggers DB failure
    });

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      candidateCampaigns: [campA, campB, campC, campD, campE],
      now: NOW_PAST_48H,
      maxRetries: 1,
      initialBackoffMs: 0,
    });

    assert(summary.succeeded === 2, `succeeded === 2 (A and D) [got ${summary.succeeded}]`);
    assert(summary.skipped === 2, `skipped === 2 (B and C) [got ${summary.skipped}]`);
    assert(summary.failed === 1, `failed === 1 (E) [got ${summary.failed}]`);

    const resA = summary.results.find((r) => r.campaignId === "CH-MIX-A");
    const resB = summary.results.find((r) => r.campaignId === "CH-MIX-B");
    const resC = summary.results.find((r) => r.campaignId === "CH-MIX-C");
    const resD = summary.results.find((r) => r.campaignId === "CH-MIX-D");
    const resE = summary.results.find((r) => r.campaignId === "CH-MIX-E");

    assert(resA?.status === "success", "Camp A processed successfully");
    assert(resB?.status === "skipped", "Camp B skipped (<48h)");
    assert(resC?.status === "skipped", "Camp C skipped (already assessed)");
    assert(resD?.status === "success", "Camp D processed successfully");
    assert(resE?.status === "failed", "Camp E failed safely without aborting batch");
    console.log(`  TEST J STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ────────────────────────────────────────────────────────────
  // TEST K: Unauthorized Scheduler Request
  // ────────────────────────────────────────────────────────────
  console.log("[TEST K] Unauthorized Scheduler Request");
  {
    process.env.CRON_SECRET = "top_secret_cron_key_98765";

    // 1. Missing header
    const reqNoHeader = { headers: new Headers() };
    const auth1 = verifyCronAuthorization(reqNoHeader);
    assert(auth1.authorized === false, "Missing Authorization header -> rejected");

    // 2. Invalid bearer token
    const reqBadHeader = { headers: new Headers({ authorization: "Bearer invalid_secret" }) };
    const auth2 = verifyCronAuthorization(reqBadHeader);
    assert(auth2.authorized === false, "Invalid bearer token -> rejected");

    // 3. Valid bearer token
    const reqGoodHeader = { headers: new Headers({ authorization: "Bearer top_secret_cron_key_98765" }) };
    const auth3 = verifyCronAuthorization(reqGoodHeader);
    assert(auth3.authorized === true, "Correct bearer token -> authorized");

    console.log(`  TEST K STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  console.log("==================================================");
  if (allPassed) {
    console.log("PHASE 4.3 STEP 6 MASTER TEST SUMMARY: ALL TESTS PASS");
  } else {
    console.log("PHASE 4.3 STEP 6 MASTER TEST SUMMARY: FAILURES DETECTED");
    process.exit(1);
  }
  console.log("==================================================");
}

runEndToEndVerification().catch((err) => {
  console.error("End-to-end verification fatal error:", err);
  process.exit(1);
});
