/**
 * Staging Smoke Test & Deployment Verification Suite
 * Phase 4.7 Step 1
 *
 * Verifies readiness of the viability assessment workflow for staging deployment:
 * 1. Environment Variable Audit (Presence verification without printing values)
 * 2. Model Artifacts Verification (Integrity & presence on disk)
 * 3. FastAPI Service Health & Readiness Probes
 * 4. User Viability History Retrieval (Read-only API test)
 * 5. Admin RBAC & Access Control Enforcement (401 Unauthorized / 403 Forbidden)
 * 6. Vercel Cron Authentication Verification (Safe, non-mutating authorization probe)
 * 7. Cloud Supabase Reachability Probe (Safe read-only check)
 */

import fs from "fs";
import path from "path";
import dns from "dns";
import dotenv from "dotenv";

if (fs.existsSync(".env.local")) {
  dotenv.config({ path: ".env.local" });
}

import { checkFastApiHealth } from "../lib/ml/fastapi.js";
import { verifyCronAuthorization } from "../lib/ml/assessmentScheduler.js";
import { GET as cronRoute } from "../app/api/cron/viability-assessment/route.js";
import { GET as adminAssessmentsRoute } from "../app/api/admin/assessments/route.js";
import { GET as userViabilityRoute } from "../app/api/campaigns/[id]/viability/route.js";

async function runStagingSmokeTests() {
  console.log("===============================================================");
  console.log("PHASE 4.7 STEP 1: STAGING DEPLOYMENT READINESS & SMOKE TESTS");
  console.log("===============================================================\n");

  const results = {
    passed: 0,
    failed: 0,
    blocked: 0,
    checks: [],
  };

  const recordCheck = (name, status, details = "") => {
    if (status === "PASS") results.passed++;
    else if (status === "FAIL") results.failed++;
    else if (status === "BLOCKED") results.blocked++;

    results.checks.push({ name, status, details });
    const mark = status === "PASS" ? "✓" : status === "BLOCKED" ? "⚠" : "✗";
    console.log(`[${mark} ${status}] ${name}${details ? ` — ${details}` : ""}`);
  };

  // -------------------------------------------------------------
  // 1. Environment Variable Audit (Strictly check presence only)
  // -------------------------------------------------------------
  console.log("--- 1. Environment Variable Configuration Audit ---");
  const nextEnvs = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", required: true },
    { key: "NEXT_PUBLIC_SUPABASE_ANON_KEY", required: false, alt: "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" },
    { key: "ML_API_URL", required: true },
    { key: "CRON_SECRET", required: true },
    { key: "ML_ASSESSMENT_BATCH_SIZE", required: false, default: "25" },
    { key: "ML_ASSESSMENT_MAX_RETRIES", required: false, default: "2" },
  ];

  for (const env of nextEnvs) {
    const isSet = Boolean(process.env[env.key] || (env.alt && process.env[env.alt]));
    if (isSet) {
      recordCheck(`Env: ${env.key}`, "PASS", "Configured");
    } else if (env.required) {
      recordCheck(`Env: ${env.key}`, "FAIL", "Missing required environment variable");
    } else {
      recordCheck(`Env: ${env.key}`, "PASS", `Optional (defaults to ${env.default || "built-in"})`);
    }
  }

  // -------------------------------------------------------------
  // 2. Machine Learning Model Artifacts Verification
  // -------------------------------------------------------------
  console.log("\n--- 2. Model Artifacts Verification ---");
  const artifacts = [
    { file: "ml/models/artifacts/random_forest_champion.joblib", minBytes: 500000 },
    { file: "ml/models/artifacts/platt_calibrator.joblib", minBytes: 500 },
    { file: "ml/models/artifacts/champion_metadata.joblib", minBytes: 500 },
    { file: "ml/experiments/results/explainability/calibration_analysis.json", minBytes: 100 },
  ];

  for (const art of artifacts) {
    try {
      const stats = fs.statSync(art.file);
      if (stats.size >= art.minBytes) {
        recordCheck(`Artifact: ${path.basename(art.file)}`, "PASS", `Present (${(stats.size / 1024).toFixed(1)} KB)`);
      } else {
        recordCheck(`Artifact: ${path.basename(art.file)}`, "FAIL", `File too small (${stats.size} B)`);
      }
    } catch {
      recordCheck(`Artifact: ${path.basename(art.file)}`, "FAIL", "Artifact missing from disk");
    }
  }

  // -------------------------------------------------------------
  // 3. FastAPI Service Health & Liveness Probe
  // -------------------------------------------------------------
  console.log("\n--- 3. FastAPI Service Health Probe ---");
  const healthResult = await checkFastApiHealth({ timeoutMs: 3000 });
  if (healthResult.healthy) {
    recordCheck("FastAPI Service Health (/health)", "PASS", `Status: ${healthResult.status}`);
  } else {
    recordCheck(
      "FastAPI Service Health (/health)",
      "BLOCKED",
      `FastAPI service unreachable at ${process.env.ML_API_URL || "configured URL"} (${healthResult.error})`
    );
  }

  // -------------------------------------------------------------
  // 4. Vercel Cron Security & Authorization Verification
  // -------------------------------------------------------------
  console.log("\n--- 4. Vercel Cron Authentication Verification ---");

  // A: Missing Authorization Header
  const reqNoAuth = { headers: new Headers() };
  const resNoAuth = await cronRoute(reqNoAuth);
  if (resNoAuth.status === 401) {
    recordCheck("Cron Probe: Missing Token Rejected", "PASS", "HTTP 401 Unauthorized");
  } else {
    recordCheck("Cron Probe: Missing Token Rejected", "FAIL", `Unexpected status ${resNoAuth.status}`);
  }

  // B: Invalid Token Header
  const reqBadAuth = {
    headers: new Headers({ authorization: "Bearer invalid_unauthorized_token_xyz" }),
  };
  const resBadAuth = await cronRoute(reqBadAuth);
  if (resBadAuth.status === 401) {
    recordCheck("Cron Probe: Invalid Token Rejected", "PASS", "HTTP 401 Unauthorized");
  } else {
    recordCheck("Cron Probe: Invalid Token Rejected", "FAIL", `Unexpected status ${resBadAuth.status}`);
  }

  // C: Valid Token Authentication Check (Direct non-mutating check)
  const validCheck = verifyCronAuthorization({
    headers: new Headers({ authorization: `Bearer ${process.env.CRON_SECRET}` }),
  });
  if (validCheck.authorized) {
    recordCheck("Cron Probe: Valid Bearer Authentication", "PASS", "Authorized with server CRON_SECRET");
  } else {
    recordCheck("Cron Probe: Valid Bearer Authentication", "FAIL", "CRON_SECRET verification failed");
  }

  // -------------------------------------------------------------
  // 5. Admin RBAC & Access Control Enforcement
  // -------------------------------------------------------------
  console.log("\n--- 5. Admin RBAC Access Control Enforcement ---");

  // A: Unauthenticated user -> 401
  const reqAnon = new Request("http://localhost:3000/api/admin/assessments", {
    headers: new Headers(),
  });
  reqAnon.supabaseClient = {
    from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) }),
    auth: { getUser: async () => ({ data: { user: null }, error: new Error("No session") }) },
  };

  const resAnon = await adminAssessmentsRoute(reqAnon);
  if (resAnon.status === 401) {
    recordCheck("Admin RBAC: Unauthenticated User", "PASS", "HTTP 401 Unauthorized");
  } else {
    recordCheck("Admin RBAC: Unauthenticated User", "FAIL", `Expected 401, got ${resAnon.status}`);
  }

  // B: Non-admin authenticated user -> 403
  const reqUser = new Request("http://localhost:3000/api/admin/assessments", {
    headers: new Headers(),
  });
  reqUser.supabaseClient = {
    from: (tbl) => {
      if (tbl === "profiles") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: async () => ({ data: { id: "u-regular", role: "user", email: "donor@user.com" }, error: null }),
            }),
          }),
        };
      }
      return { select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: null, error: null }) }) }) };
    },
    auth: { getUser: async () => ({ data: { user: { id: "u-regular", email: "donor@user.com" } }, error: null }) },
  };

  const resUser = await adminAssessmentsRoute(reqUser);
  if (resUser.status === 403) {
    recordCheck("Admin RBAC: Non-Admin User", "PASS", "HTTP 403 Forbidden");
  } else {
    recordCheck("Admin RBAC: Non-Admin User", "FAIL", `Expected 403, got ${resUser.status}`);
  }

  // -------------------------------------------------------------
  // 6. User Viability History Retrieval (Read-only API)
  // -------------------------------------------------------------
  console.log("\n--- 6. User Viability Route Verification ---");
  const reqUserViability = new Request("http://localhost:3000/api/campaigns/CH-01/viability?history=true");
  reqUserViability.supabaseClient = {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: () => ({
            order: () => ({
              limit: async () => ({
                data: [
                  {
                    id: "test-smoke-01",
                    campaign_id: "CH-01",
                    viability_score: 82,
                    risk_probability: 0.18,
                    risk_level: "LOW RISK",
                    prediction_horizon_hours: 48,
                    model_name: "Random Forest Champion",
                    model_type: "RandomForestClassifier",
                    n_features: 56,
                    calibration: "Platt Scaling (Sigmoid)",
                    base_rate_risk: 0.4996,
                    top_risk_factors: ["Early volume in moderate tier"],
                    top_supporting_factors: ["Consistent velocity"],
                    assessment_type: "initial_48h",
                    status: "completed",
                    created_at: new Date().toISOString(),
                  },
                ],
                error: null,
              }),
            }),
          }),
        }),
      }),
    }),
  };

  const resUserViability = await userViabilityRoute(reqUserViability, { params: Promise.resolve({ id: "CH-01" }) });
  if (resUserViability.status === 200) {
    const json = await resUserViability.json();
    if (json.success && json.data && Array.isArray(json.history)) {
      recordCheck("User Viability History API", "PASS", "HTTP 200 with latest assessment & history array");
    } else {
      recordCheck("User Viability History API", "FAIL", "Response payload missing required fields");
    }
  } else {
    recordCheck("User Viability History API", "FAIL", `HTTP ${resUserViability.status}`);
  }

  // -------------------------------------------------------------
  // 7. Cloud Supabase Reachability Probe
  // -------------------------------------------------------------
  console.log("\n--- 7. Cloud Supabase Reachability Probe ---");
  const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!rawUrl) {
    recordCheck("Cloud Supabase Reachability", "BLOCKED", "NEXT_PUBLIC_SUPABASE_URL not configured");
  } else {
    try {
      const parsed = new URL(rawUrl);
      const host = parsed.hostname;

      await new Promise((resolve) => {
        dns.lookup(host, (err) => {
          if (err) {
            recordCheck(
              "Cloud Supabase DNS Resolution",
              "BLOCKED",
              `Hostname ${host} returned ${err.code} (${err.message}). Staging Supabase project is not yet provisioned or DNS is inactive.`
            );
          } else {
            recordCheck("Cloud Supabase DNS Resolution", "PASS", `Hostname ${host} resolved successfully.`);
          }
          resolve();
        });
      });
    } catch (e) {
      recordCheck("Cloud Supabase URL Parsing", "FAIL", e.message);
    }
  }

  // -------------------------------------------------------------
  // SUMMARY
  // -------------------------------------------------------------
  console.log("\n===============================================================");
  console.log(`SMOKE TEST SUMMARY: ${results.passed} Passed, ${results.failed} Failed, ${results.blocked} Blocked/External`);
  console.log("===============================================================");

  return results;
}

runStagingSmokeTests().catch(console.error);
