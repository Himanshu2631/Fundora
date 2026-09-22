/**
 * Phase 4.3 Step 5: Safe Failure Handling & Controlled Retry Behavior Tests
 *
 * Tests the automated assessment resilience and retry policies:
 *   TEST 1 — Normal success (1 attempt -> 1 DB assessment)
 *   TEST 2 — FastAPI unavailable (controlled failure -> 0 DB rows -> batch continues)
 *   TEST 3 — Temporary FastAPI failure followed by success (retries boundedly -> 1 assessment -> no duplicates)
 *   TEST 4 — FastAPI validation error (permanent failure -> 0 retries -> no DB rows)
 *   TEST 5 — Supabase temporary failure followed by success (retried -> eventually persisted)
 *   TEST 6 — Response lost after successful insert (idempotency -> skip -> no duplicates)
 *   TEST 7 — Multiple campaigns (A=success, B=retryable failure, C=success -> fault isolation)
 *   TEST 8 — Maximum retry limit (persistent retryable error stops after maxRetries)
 *
 * Run with: node scratch/test_retries.js
 */

import {
  runScheduledViabilityAssessments,
  findCandidateCampaigns,
  getMaxRetries,
  calculateBackoffMs,
} from "../lib/ml/assessmentScheduler.js";
import {
  classifyAssessmentFailure,
  FAILURE_CATEGORIES,
} from "../lib/ml/failureClassifier.js";
import { runCampaignViabilityAssessment } from "../lib/ml/assessmentRunner.js";

// Ensure environment
process.env.ML_API_URL = process.env.ML_API_URL || "http://127.0.0.1:8000";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test_cron_secret_local_dev";
process.env.ML_ASSESSMENT_MAX_RETRIES = "2";

// ============================================================
// FIXTURES
// ============================================================

const LAUNCH_ISO = "2026-09-01T10:00:00.000Z";
const LAUNCH_MS = new Date(LAUNCH_ISO).getTime();
const NOW_PAST_48H = new Date(LAUNCH_MS + 52 * 3600 * 1000).toISOString();

const BASE_CAMPAIGN = {
  id: "CH-RETRY-01",
  name: "Clean Water Project",
  description: "Solar-powered water purification systems for remote villages.",
  why_matters: "Reduces waterborne diseases and improves child survival.",
  image_url: "/water.png",
  category: "Clean Water",
  impact: "15,000 residents reached.",
  created_at: LAUNCH_ISO,
  updated_at: LAUNCH_ISO,
};

const BASE_ALLOCATIONS = [
  {
    id: "sel-1",
    charity_id: "CH-RETRY-01",
    contribution_percentage: 25,
    created_at: new Date(LAUNCH_MS + 3600 * 1000).toISOString(),
  },
];

// ============================================================
// CONFIGURABLE MOCK SUPABASE CLIENT
// ============================================================

function createMockRetryClient({
  campaigns = [BASE_CAMPAIGN],
  allocations = BASE_ALLOCATIONS,
  initialAssessments = [],
  failInsertAttempts = 0, // Number of times INSERT should fail before succeeding
  insertErrorMessage = "Simulated transient database connection error",
  failCampaignLookupId = null,
} = {}) {
  const charityRows = [...campaigns];
  const allocationRows = [...allocations];
  const assessmentRows = [...initialAssessments];
  let insertAttemptCount = 0;

  const client = {
    getStoredAssessments: () => [...assessmentRows],
    getInsertAttemptCount: () => insertAttemptCount,

    from: (table) => {
      if (table === "charities") {
        return {
          select: () => {
            let filterLte = null;
            let limitVal = null;

            const chain = {
              eq: (f, v) => {
                if (failCampaignLookupId && v === failCampaignLookupId) {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: "Simulated database connection failure" },
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
            insertAttemptCount++;

            // Simulate transient failures for the first N insert attempts
            if (insertAttemptCount <= failInsertAttempts) {
              const transientErr = new Error(insertErrorMessage);
              return {
                select: () => ({
                  single: async () => ({ data: null, error: transientErr }),
                }),
              };
            }

            // DB unique partial index check
            const isInitial = (record.assessment_type || "initial_48h") === "initial_48h";
            const exists = assessmentRows.some(
              (a) =>
                a.campaign_id === record.campaign_id &&
                (a.assessment_type || "initial_48h") === "initial_48h"
            );

            if (isInitial && exists) {
              const err = new Error(
                'duplicate key value violates unique constraint "idx_unique_campaign_initial_48h_assessment" (SQLSTATE 23505)'
              );
              err.code = "23505";
              return {
                select: () => ({
                  single: async () => ({ data: null, error: err }),
                }),
              };
            }

            const stored = {
              id: "retry-assess-" + (assessmentRows.length + 1),
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
// TEST SUITE
// ============================================================

async function runAllTests() {
  console.log("==================================================");
  console.log("PHASE 4.3 STEP 5: FAILURE HANDLING & RETRY TESTS");
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

  // ----------------------------------------------------------
  // TEST 1: Normal success
  // ----------------------------------------------------------
  console.log("[TEST 1] Normal success - 1 attempt -> exactly 1 assessment row");
  {
    const mockClient = createMockRetryClient();
    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      initialBackoffMs: 0,
    });

    assert(summary.success === true, "summary.success is true");
    assert(summary.succeeded === 1, "succeeded === 1");
    assert(summary.failed === 0, "failed === 0");
    assert(summary.results[0].attempts === 1, "completed on attempt 1");
    assert(mockClient.getStoredAssessments().length === 1, "exactly 1 assessment stored");
    console.log(`  TEST 1 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 2: FastAPI unavailable
  // ----------------------------------------------------------
  console.log("[TEST 2] FastAPI unavailable - controlled failure -> 0 DB rows -> batch continues");
  {
    const savedUrl = process.env.ML_API_URL;
    process.env.ML_API_URL = "http://127.0.0.1:9999"; // Non-existent port
    const mockClient = createMockRetryClient();

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      maxRetries: 1, // small retry for test speed
      initialBackoffMs: 0,
    });

    assert(summary.success === true, "scheduler completed execution");
    assert(summary.succeeded === 0, "succeeded === 0");
    assert(summary.failed === 1, "failed === 1");
    assert(summary.results[0].retryable === true, "classified as retryable failure");
    assert(mockClient.getStoredAssessments().length === 0, "zero DB assessments created");
    process.env.ML_API_URL = savedUrl;
    console.log(`  TEST 2 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 3: Temporary FastAPI failure followed by success
  // ----------------------------------------------------------
  console.log("[TEST 3] Temporary FastAPI failure followed by success - retried -> 1 assessment");
  {
    // Simulate temporary fetch failure on attempt 1, succeeding on attempt 2
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;

    globalThis.fetch = async (...args) => {
      fetchCalls++;
      if (fetchCalls === 1) {
        throw new TypeError("fetch failed: ECONNRESET");
      }
      return originalFetch(...args);
    };

    const mockClient = createMockRetryClient();

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      maxRetries: 2,
      initialBackoffMs: 0, // fast test execution
    });

    globalThis.fetch = originalFetch;

    assert(summary.succeeded === 1, "succeeded === 1 after retry");
    assert(summary.failed === 0, "failed === 0");
    assert(summary.results[0].attempts === 2, "succeeded on attempt 2");
    assert(mockClient.getStoredAssessments().length === 1, "exactly 1 assessment stored (no duplicate)");
    console.log(`  TEST 3 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 4: FastAPI validation error
  // ----------------------------------------------------------
  console.log("[TEST 4] FastAPI validation error - permanent failure -> 0 retries -> no DB rows");
  {
    // Simulate FastAPI returning 422 Unprocessable Entity
    const originalFetch = globalThis.fetch;
    let fetchCalls = 0;

    globalThis.fetch = async () => {
      fetchCalls++;
      return {
        ok: false,
        status: 422,
        json: async () => ({
          detail: [{ loc: ["body", "goal"], msg: "Field required" }],
        }),
      };
    };

    const mockClient = createMockRetryClient();

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      maxRetries: 2,
      initialBackoffMs: 0,
    });

    globalThis.fetch = originalFetch;

    assert(summary.failed === 1, "failed === 1");
    assert(summary.succeeded === 0, "succeeded === 0");
    assert(summary.results[0].retryable === false, "classified as non-retryable");
    assert(summary.results[0].category === FAILURE_CATEGORIES.VALIDATION_ERROR, "category is validation_error");
    assert(summary.results[0].attempts === 1, "stopped immediately after 1 attempt (did NOT retry)");
    assert(fetchCalls === 1, "fetch called exactly once");
    assert(mockClient.getStoredAssessments().length === 0, "zero DB assessments created");
    console.log(`  TEST 4 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 5: Supabase temporary failure
  // ----------------------------------------------------------
  console.log("[TEST 5] Supabase temporary failure - retried -> eventual successful storage");
  {
    // Fail first insert attempt, succeed on second insert attempt
    const mockClient = createMockRetryClient({
      failInsertAttempts: 1,
    });

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      maxRetries: 2,
      initialBackoffMs: 0,
    });

    assert(summary.succeeded === 1, "succeeded === 1");
    assert(summary.failed === 0, "failed === 0");
    assert(summary.results[0].attempts === 2, "succeeded on attempt 2 after DB retry");
    assert(mockClient.getStoredAssessments().length === 1, "assessment successfully persisted");
    console.log(`  TEST 5 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 6: Response lost after successful insert (Idempotency)
  // ----------------------------------------------------------
  console.log("[TEST 6] Response lost after successful insert - existing assessment detected -> skipped -> no duplicate");
  {
    const mockClient = createMockRetryClient();

    // 1. Initial execution stores assessment
    const run1 = await runCampaignViabilityAssessment("CH-RETRY-01", {
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
    });
    assert(run1.success === true && run1.skipped === false, "Run 1 persisted assessment");
    assert(mockClient.getStoredAssessments().length === 1, "1 assessment stored in DB");

    // 2. Client simulates lost response / retry
    const run2 = await runCampaignViabilityAssessment("CH-RETRY-01", {
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
    });
    assert(run2.success === true && run2.skipped === true, "Run 2 detected existing assessment and cleanly skipped");
    assert(mockClient.getStoredAssessments().length === 1, "assessment count remains exactly 1 (NO duplicate created)");
    console.log(`  TEST 6 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 7: Multiple campaigns (A=success, B=retryable failure, C=success)
  // ----------------------------------------------------------
  console.log("[TEST 7] Multiple campaigns - Campaign A (success), Campaign B (retryable failure), Campaign C (success)");
  {
    const campA = { ...BASE_CAMPAIGN, id: "CH-MULTI-A", name: "Campaign A" };
    const campB = { ...BASE_CAMPAIGN, id: "CH-MULTI-B", name: "Campaign B" }; // Will fail transiently
    const campC = { ...BASE_CAMPAIGN, id: "CH-MULTI-C", name: "Campaign C" };

    const allocs = [
      { id: "a1", charity_id: "CH-MULTI-A", contribution_percentage: 20, created_at: new Date(LAUNCH_MS + 3600000).toISOString() },
      { id: "a2", charity_id: "CH-MULTI-C", contribution_percentage: 30, created_at: new Date(LAUNCH_MS + 3600000).toISOString() },
    ];

    const mockClient = createMockRetryClient({
      campaigns: [campA, campB, campC],
      allocations: allocs,
      failCampaignLookupId: "CH-MULTI-B", // Campaign B triggers transient DB error
    });

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      candidateCampaigns: [campA, campB, campC],
      now: NOW_PAST_48H,
      maxRetries: 1,
      initialBackoffMs: 0,
    });

    assert(summary.succeeded === 2, "Campaigns A and C succeeded (succeeded === 2)");
    assert(summary.failed === 1, "Campaign B failed (failed === 1)");

    const resA = summary.results.find((r) => r.campaignId === "CH-MULTI-A");
    const resB = summary.results.find((r) => r.campaignId === "CH-MULTI-B");
    const resC = summary.results.find((r) => r.campaignId === "CH-MULTI-C");

    assert(resA?.status === "success", "Campaign A succeeded");
    assert(resB?.status === "failed" && resB?.retryable === true, "Campaign B failed without halting the batch");
    assert(resC?.status === "success", "Campaign C succeeded despite B's failure");
    console.log(`  TEST 7 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 8: Maximum retry limit
  // ----------------------------------------------------------
  console.log("[TEST 8] Maximum retry limit - persistent transient failure terminates after bounded attempts");
  {
    // Force persistent 503 Service Unavailable
    const originalFetch = globalThis.fetch;
    let fetchAttempts = 0;

    globalThis.fetch = async () => {
      fetchAttempts++;
      return {
        ok: false,
        status: 503,
        json: async () => ({ detail: "ML service temporarily overloaded" }),
      };
    };

    const mockClient = createMockRetryClient();
    const configuredMaxRetries = 2; // total attempts = 3

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
      maxRetries: configuredMaxRetries,
      initialBackoffMs: 0,
    });

    globalThis.fetch = originalFetch;

    assert(summary.failed === 1, "failed === 1");
    assert(summary.succeeded === 0, "succeeded === 0");
    assert(summary.results[0].attempts === 3, `attempts count is exactly 3 (1 initial + ${configuredMaxRetries} retries)`);
    assert(summary.results[0].retryable === true, "failure marked as retryable for next scheduled run");
    assert(fetchAttempts === 3, "fetch called exactly 3 times before bounded termination");
    console.log(`  TEST 8 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  console.log("==================================================");
  if (allPassed) {
    console.log("PHASE 4.3 STEP 5 TEST SUMMARY: ALL 8 TESTS PASS");
  } else {
    console.log("PHASE 4.3 STEP 5 TEST SUMMARY: FAILURES DETECTED");
    process.exit(1);
  }
  console.log("==================================================");
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
