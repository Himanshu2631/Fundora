/**
 * Phase 4.3 Step 4: Scheduled Automation Trigger Tests
 *
 * Tests the scheduled trigger and candidate discovery pipeline:
 *   TEST 1 — Eligible campaign (Scheduler -> Discovery -> Runner -> ML -> DB)
 *   TEST 2 — Campaign below 48 hours (Candidate/eligibility skips, FastAPI NOT called)
 *   TEST 3 — Already assessed campaign (Runner detects initial assessment -> skip, no duplicate)
 *   TEST 4 — Multiple campaigns (Fault isolation: A=Success, B=Failure, C=Success)
 *   TEST 5 — Empty candidate list (Scheduler completes cleanly with 0 assessments)
 *   TEST 6 — Unauthorized scheduled request (Missing/invalid auth rejected, ML NOT called)
 *   TEST 7 — Repeated scheduler execution (Idempotency: Run 1 assesses, Run 2 skips, 0 duplicates)
 *
 * Run with: node scratch/test_scheduler.js
 */

import {
  runScheduledViabilityAssessments,
  findCandidateCampaigns,
  getAssessmentBatchSize,
  DEFAULT_BATCH_SIZE,
  verifyCronAuthorization,
} from "../lib/ml/assessmentScheduler.js";

// Ensure local environment variables are populated for testing
process.env.ML_API_URL = process.env.ML_API_URL || "http://127.0.0.1:8000";
process.env.CRON_SECRET = process.env.CRON_SECRET || "test_cron_secret_local_dev";

// ============================================================
// FIXTURES
// ============================================================

const LAUNCH_ISO = "2026-09-01T10:00:00.000Z";
const LAUNCH_MS = new Date(LAUNCH_ISO).getTime();

// Reference times
const NOW_PAST_48H = new Date(LAUNCH_MS + 52 * 3600 * 1000).toISOString(); // 52h after launch (> 48h)
const NOW_ONLY_24H = new Date(LAUNCH_MS + 24 * 3600 * 1000).toISOString(); // 24h after launch (< 48h)

const BASE_CAMPAIGN = {
  id: "CH-SCHED-01",
  name: "Clean Water Initiative",
  description:
    "Providing scalable reverse-osmosis filtration units to remote rural communities in arid zones.",
  why_matters:
    "Prevents chronic waterborne diseases and reduces child mortality in vulnerable communities.",
  image_url: "/water.png",
  category: "Clean Water",
  impact: "12,000 villagers with daily potable water.",
  created_at: LAUNCH_ISO,
  updated_at: LAUNCH_ISO,
};

const BASE_ALLOCATIONS = [
  {
    id: "sel-1",
    charity_id: "CH-SCHED-01",
    contribution_percentage: 25,
    created_at: new Date(LAUNCH_MS + 3600 * 1000).toISOString(),
  },
  {
    id: "sel-2",
    charity_id: "CH-SCHED-01",
    contribution_percentage: 35,
    created_at: new Date(LAUNCH_MS + 72000 * 1000).toISOString(),
  },
];

// ============================================================
// IN-MEMORY MOCK SUPABASE CLIENT
// ============================================================

function createMockSchedulerClient({
  campaigns = [BASE_CAMPAIGN],
  allocations = BASE_ALLOCATIONS,
  initialAssessments = [],
  failCampaignId = null,
} = {}) {
  const charityRows = [...campaigns];
  const allocationRows = [...allocations];
  const assessmentRows = [...initialAssessments];

  const client = {
    getStoredAssessments: () => [...assessmentRows],
    getCharities: () => [...charityRows],

    from: (table) => {
      // ------------------------------------------------------------------
      // charities table
      // ------------------------------------------------------------------
      if (table === "charities") {
        return {
          select: () => {
            let filterLte = null;
            let limitVal = null;

            const chain = {
              eq: (f, v) => {
                if (failCampaignId && v === failCampaignId) {
                  return {
                    maybeSingle: async () => ({
                      data: null,
                      error: { message: "Simulated database connection error" },
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

      // ------------------------------------------------------------------
      // user_charity_selections table
      // ------------------------------------------------------------------
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

      // ------------------------------------------------------------------
      // campaign_viability_assessments table
      // ------------------------------------------------------------------
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
              id: "sched-assess-" + (assessmentRows.length + 1),
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

      throw new Error(`Unexpected table queried in mock: ${table}`);
    },
  };

  return client;
}

// ============================================================
// TEST SUITE
// ============================================================

async function runAllTests() {
  console.log("==================================================");
  console.log("PHASE 4.3 STEP 4: SCHEDULED TRIGGER TESTS");
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
  // TEST 1: Eligible campaign
  // ----------------------------------------------------------
  console.log("[TEST 1] Eligible campaign - scheduler -> discovery -> runner -> ML -> Supabase");
  {
    const mockClient = createMockSchedulerClient();

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
    });

    assert(summary.success === true, "summary.success is true");
    assert(summary.candidatesFound === 1, "candidatesFound is 1");
    assert(summary.processed === 1, "processed count is 1");
    assert(summary.succeeded === 1, "succeeded count is 1");
    assert(summary.skipped === 0, "skipped count is 0");
    assert(summary.failed === 0, "failed count is 0");
    assert(mockClient.getStoredAssessments().length === 1, "assessment record persisted in Supabase");

    const row = mockClient.getStoredAssessments()[0];
    assert(row.campaign_id === "CH-SCHED-01", "persisted campaign_id is correct");
    assert(row.assessment_type === "initial_48h", "assessment_type is initial_48h");
    assert(typeof row.viability_score === "number", "viability_score stored as number");
    assert(typeof row.risk_probability === "number", "risk_probability stored as number");
    console.log(`  TEST 1 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 2: Campaign below 48 hours
  // ----------------------------------------------------------
  console.log("[TEST 2] Campaign below 48 hours - expect skip (FastAPI NOT called)");
  {
    const mockClient = createMockSchedulerClient();

    // With NOW_ONLY_24H, campaign launched 24h ago: findCandidateCampaigns filters it out,
    // or if passed to runner, eligibility check returns ineligible.
    const candidates = await findCandidateCampaigns(mockClient, {
      now: NOW_ONLY_24H,
    });
    assert(candidates.length === 0, "candidate discovery excludes <48h campaign");

    // Also verify if candidate is evaluated at runner level with now=NOW_ONLY_24H
    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      candidateCampaigns: [BASE_CAMPAIGN], // explicitly pass candidate
      now: NOW_ONLY_24H,                   // but server time is only 24h after launch
    });

    assert(summary.candidatesFound === 1, "candidatesFound is 1");
    assert(summary.succeeded === 0, "succeeded count is 0");
    assert(summary.skipped === 1, "skipped count is 1");
    assert(summary.failed === 0, "failed count is 0");
    assert(mockClient.getStoredAssessments().length === 0, "zero assessment rows in DB");
    assert(
      summary.results[0].reason.includes("maturity"),
      `Skip reason mentions maturity: "${summary.results[0].reason}"`
    );
    console.log(`  TEST 2 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 3: Already assessed campaign
  // ----------------------------------------------------------
  console.log("[TEST 3] Already assessed campaign - runner detects initial assessment -> skip");
  {
    const existingRow = {
      id: "existing-assess-1",
      campaign_id: "CH-SCHED-01",
      assessment_type: "initial_48h",
      viability_score: 85,
    };
    const mockClient = createMockSchedulerClient({
      initialAssessments: [existingRow],
    });

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
    });

    assert(summary.candidatesFound === 1, "candidatesFound is 1");
    assert(summary.succeeded === 0, "succeeded count is 0");
    assert(summary.skipped === 1, "skipped count is 1");
    assert(summary.failed === 0, "failed count is 0");
    assert(mockClient.getStoredAssessments().length === 1, "assessment count remains exactly 1 (no duplicate)");
    assert(
      summary.results[0].reason.includes("already received"),
      `Skip reason: "${summary.results[0].reason}"`
    );
    console.log(`  TEST 3 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 4: Multiple campaigns - Fault Isolation / Processing Safety
  // ----------------------------------------------------------
  console.log("[TEST 4] Multiple campaigns - Campaign A (success), Campaign B (failure), Campaign C (success)");
  {
    const campA = { ...BASE_CAMPAIGN, id: "CH-BATCH-A", name: "Campaign A" };
    const campB = { ...BASE_CAMPAIGN, id: "CH-BATCH-B", name: "Campaign B" }; // Will fail on lookup
    const campC = { ...BASE_CAMPAIGN, id: "CH-BATCH-C", name: "Campaign C" };

    const allocs = [
      { id: "a1", charity_id: "CH-BATCH-A", contribution_percentage: 20, created_at: new Date(LAUNCH_MS + 3600000).toISOString() },
      { id: "a2", charity_id: "CH-BATCH-C", contribution_percentage: 30, created_at: new Date(LAUNCH_MS + 3600000).toISOString() },
    ];

    const mockClient = createMockSchedulerClient({
      campaigns: [campA, campB, campC],
      allocations: allocs,
      failCampaignId: "CH-BATCH-B", // Campaign B fails in DB query
    });

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      candidateCampaigns: [campA, campB, campC],
      now: NOW_PAST_48H,
    });

    assert(summary.candidatesFound === 3, "candidatesFound is 3");
    assert(summary.processed === 3, "processed is 3");
    assert(summary.succeeded === 2, "succeeded is 2 (A and C succeeded)");
    assert(summary.failed === 1, "failed is 1 (B failed safely)");
    assert(summary.skipped === 0, "skipped is 0");

    // Verify A, B, and C results
    const resultA = summary.results.find((r) => r.campaignId === "CH-BATCH-A");
    const resultB = summary.results.find((r) => r.campaignId === "CH-BATCH-B");
    const resultC = summary.results.find((r) => r.campaignId === "CH-BATCH-C");

    assert(resultA?.status === "success", "Campaign A succeeded");
    assert(resultB?.status === "failed", "Campaign B recorded as failed without stopping execution");
    assert(resultC?.status === "success", "Campaign C succeeded despite Campaign B failure");
    console.log(`  TEST 4 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 5: Empty candidate list
  // ----------------------------------------------------------
  console.log("[TEST 5] Empty candidate list - completes cleanly with 0 assessments");
  {
    const mockClient = createMockSchedulerClient({
      campaigns: [], // no campaigns
    });

    const summary = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
    });

    assert(summary.success === true, "summary.success is true");
    assert(summary.candidatesFound === 0, "candidatesFound is 0");
    assert(summary.processed === 0, "processed is 0");
    assert(summary.succeeded === 0, "succeeded is 0");
    assert(summary.skipped === 0, "skipped is 0");
    assert(summary.failed === 0, "failed is 0");
    assert(summary.results.length === 0, "results array is empty");
    console.log(`  TEST 5 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 6: Unauthorized scheduled request
  // ----------------------------------------------------------
  console.log("[TEST 6] Unauthorized scheduled request - missing / invalid token rejected");
  {
    process.env.CRON_SECRET = "super_secure_cron_token_12345";

    // 1. Request with no Authorization header
    const reqNoAuth = {
      headers: new Headers(),
    };
    const resNoAuth = verifyCronAuthorization(reqNoAuth);
    assert(resNoAuth.authorized === false, "No Authorization header -> rejected");

    // 2. Request with invalid Bearer token
    const reqBadAuth = {
      headers: new Headers({
        authorization: "Bearer wrong_token_attempt",
      }),
    };
    const resBadAuth = verifyCronAuthorization(reqBadAuth);
    assert(resBadAuth.authorized === false, "Invalid Bearer token -> rejected");

    // 3. Request with valid Bearer token
    const reqValidAuth = {
      headers: new Headers({
        authorization: "Bearer super_secure_cron_token_12345",
      }),
    };
    const resValidAuth = verifyCronAuthorization(reqValidAuth);
    assert(resValidAuth.authorized === true, "Correct Bearer token -> authorized");

    // 4. Server misconfiguration (CRON_SECRET empty)
    const savedSecret = process.env.CRON_SECRET;
    delete process.env.CRON_SECRET;
    const resNoSecret = verifyCronAuthorization(reqValidAuth);
    assert(resNoSecret.authorized === false, "Missing server CRON_SECRET -> safely rejected");
    process.env.CRON_SECRET = savedSecret;

    console.log(`  TEST 6 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  // ----------------------------------------------------------
  // TEST 7: Repeated scheduler execution (Idempotency)
  // ----------------------------------------------------------
  console.log("[TEST 7] Repeated scheduler execution - run 1 assesses, run 2 skips, no duplicates");
  {
    const mockClient = createMockSchedulerClient();

    // Run 1: Campaign is assessed
    const run1 = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
    });
    assert(run1.succeeded === 1, "Run 1: succeeded is 1");
    assert(run1.skipped === 0, "Run 1: skipped is 0");
    assert(mockClient.getStoredAssessments().length === 1, "Run 1: exactly 1 assessment stored");

    // Run 2: Immediately run again
    const run2 = await runScheduledViabilityAssessments({
      supabaseClient: mockClient,
      now: NOW_PAST_48H,
    });
    assert(run2.succeeded === 0, "Run 2: succeeded is 0");
    assert(run2.skipped === 1, "Run 2: skipped is 1 (cleanly skipped)");
    assert(mockClient.getStoredAssessments().length === 1, "Run 2: still exactly 1 assessment stored (NO duplicate)");

    console.log(`  Run 1 -> succeeded: ${run1.succeeded}, skipped: ${run1.skipped}`);
    console.log(`  Run 2 -> succeeded: ${run2.succeeded}, skipped: ${run2.skipped}`);
    console.log(`  Total DB records: ${mockClient.getStoredAssessments().length}`);
    console.log(`  TEST 7 STATUS: ${allPassed ? "PASS" : "FAIL"}\n`);
  }

  console.log("==================================================");
  if (allPassed) {
    console.log("PHASE 4.3 STEP 4 TEST SUMMARY: ALL 7 TESTS PASS");
  } else {
    console.log("PHASE 4.3 STEP 4 TEST SUMMARY: FAILURES DETECTED");
    process.exit(1);
  }
  console.log("==================================================");
}

runAllTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
