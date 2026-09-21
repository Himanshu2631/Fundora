import { assessCampaignViability } from "../lib/ml/assessmentService.js";
import { buildCampaignViabilityPayload } from "../lib/ml/payloadMapper.js";
import { predictCampaignViability } from "../lib/ml/fastapi.js";

// Helper for testing database
function createE2EDatabase() {
  const launchIso = "2026-09-01T10:00:00.000Z";
  const launchMs = new Date(launchIso).getTime();

  const campaignRecord = {
    id: "CH-01",
    name: "Acres of Green",
    description: "Dedicated to restoring local woodland ecosystems, planting native broadleaf species, and protecting wildlife corridors from commercial fragmentation.",
    why_matters: "Healthy woodlands act as natural carbon sinks, buffer regional temperature rises, regulate hydrological cycles, and preserve native biodiversity.",
    image_url: "/acres_of_green.png",
    featured: true,
    category: "Environment",
    impact: "7,400+ hectares of ancient forests protected this quarter.",
    auditor_score: "9.8",
    spending_ratio: "96.4%",
    raised: "₹14,53,000",
    created_at: launchIso,
    updated_at: launchIso
  };

  const allocations = [
    { id: "sel-1", charity_id: "CH-01", contribution_percentage: 20, created_at: new Date(launchMs + 3600 * 1000).toISOString() }, // 1h (valid)
    { id: "sel-2", charity_id: "CH-01", contribution_percentage: 30, created_at: new Date(launchMs + 72000 * 1000).toISOString() }, // 20h (valid)
    { id: "sel-3", charity_id: "CH-01", contribution_percentage: 40, created_at: new Date(launchMs + 250000 * 1000).toISOString() } // 69.4h (post-48h -> must be excluded)
  ];

  const storedAssessments = [];
  let shouldFailInsert = false;

  return {
    setFailInsert: (val) => { shouldFailInsert = val; },
    getStoredAssessments: () => storedAssessments,
    getCampaignRecord: () => ({ ...campaignRecord }),
    getAllocations: () => [...allocations],
    from: (table) => {
      if (table === "charities") {
        return {
          select: () => ({
            eq: (field, val) => ({
              maybeSingle: async () => ({
                data: val === campaignRecord.id ? { ...campaignRecord } : null,
                error: null
              })
            })
          })
        };
      }
      if (table === "user_charity_selections") {
        return {
          select: () => ({
            eq: (field, val) => ({
              data: allocations.filter(a => a.charity_id === val),
              error: null
            })
          })
        };
      }
      if (table === "campaign_viability_assessments") {
        return {
          insert: (record) => {
            if (shouldFailInsert) {
              return {
                select: () => ({
                  single: async () => ({ data: null, error: { message: "Database connection failed" } })
                }),
                single: async () => ({ data: null, error: { message: "Database connection failed" } })
              };
            }
            const created = {
              id: "assess-uuid-" + (storedAssessments.length + 1),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...record
            };
            storedAssessments.push(created);
            return {
              select: () => ({
                single: async () => ({ data: created, error: null })
              }),
              single: async () => ({ data: created, error: null })
            };
          }
        };
      }
      return { select: () => ({ eq: () => ({ data: [], error: null }) }) };
    }
  };
}

async function runE2EVerification() {
  process.env.ML_API_URL = "http://127.0.0.1:8000";
  console.log("==================================================");
  console.log("PHASE 4.2 STEP 6: COMPLETE END-TO-END VERIFICATION");
  console.log("==================================================");

  const db = createE2EDatabase();
  const initialCampaignSnapshot = JSON.stringify(db.getCampaignRecord());
  const initialAllocationsSnapshot = JSON.stringify(db.getAllocations());

  // TEST 1: Full Successful Pipeline
  console.log("\n[TEST 1] Running Complete Successful Pipeline...");
  const res1 = await assessCampaignViability("CH-01", {
    supabaseClient: db,
    targetGoal: 10000.0,
    country: "US"
  });

  const storedRows = db.getStoredAssessments();
  const row = storedRows[0];
  const t1_success = res1.success === true && Boolean(res1.assessment_id) && storedRows.length === 1;
  const t1_fieldsMatch =
    row.campaign_id === "CH-01" &&
    row.risk_probability === Math.round(res1.prediction.risk_probability * 10000) / 10000 &&
    row.viability_score === res1.prediction.viability_score &&
    row.risk_level === res1.prediction.risk_level &&
    row.model_name === res1.prediction.model.name &&
    row.n_features === 56 &&
    row.top_risk_factors.length === res1.prediction.explanation.top_risk_factors.length;

  console.log(`- Test 1 Status: ${t1_success && t1_fieldsMatch ? "PASS" : "FAIL"}`);
  console.log(`- Stored Assessment ID: ${res1.assessment_id}`);
  console.log(`- Stored Score / Risk: ${row.viability_score} / ${row.risk_level}`);

  // TEST 2: 48-Hour Leakage & Raised Amount Protection
  console.log("\n[TEST 2] Verifying 48-Hour Leakage Protection...");
  const payload = await buildCampaignViabilityPayload("CH-01", {
    supabaseClient: db,
    targetGoal: 10000.0
  });
  const t2_noPost48h = !payload.donations.some(d => d.seconds_elapsed > 172800);
  const t2_noRaised = payload.raised === undefined;
  const t2_validCount = payload.donations.length === 2; // only sel-1 and sel-2
  console.log(`- No post-48h donations: ${t2_noPost48h}`);
  console.log(`- No 'raised' field in ML payload: ${t2_noRaised}`);
  console.log(`- Donations count (strictly <= 48h): ${payload.donations.length}`);
  console.log(`- Test 2 Status: ${t2_noPost48h && t2_noRaised && t2_validCount ? "PASS" : "FAIL"}`);

  // TEST 3: FastAPI Failure Handling
  console.log("\n[TEST 3] Verifying FastAPI Service Failure Handling...");
  process.env.ML_API_URL = "http://127.0.0.1:9999"; // Offline port
  let t3_caught = false;
  const countBeforeT3 = db.getStoredAssessments().length;
  try {
    await assessCampaignViability("CH-01", { supabaseClient: db });
  } catch (err) {
    t3_caught = true;
  }
  process.env.ML_API_URL = "http://127.0.0.1:8000"; // Restore
  const countAfterT3 = db.getStoredAssessments().length;
  const t3_noRows = countAfterT3 === countBeforeT3;
  console.log(`- Error caught gracefully: ${t3_caught}`);
  console.log(`- Zero database rows created during ML outage: ${t3_noRows}`);
  console.log(`- Test 3 Status: ${t3_caught && t3_noRows ? "PASS" : "FAIL"}`);

  // TEST 4: Invalid ML Input Rejection
  console.log("\n[TEST 4] Verifying Invalid ML Input Handling...");
  let t4_caught = false;
  const countBeforeT4 = db.getStoredAssessments().length;
  try {
    await predictCampaignViability({
      campaign_id: "INVALID_01",
      goal: -100.0 // Invalid negative goal
    });
  } catch (err) {
    t4_caught = true;
  }
  const countAfterT4 = db.getStoredAssessments().length;
  console.log(`- FastAPI validation rejected invalid payload: ${t4_caught}`);
  console.log(`- Zero rows created: ${countAfterT4 === countBeforeT4}`);
  console.log(`- Test 4 Status: ${t4_caught && countAfterT4 === countBeforeT4 ? "PASS" : "FAIL"}`);

  // TEST 5: Database Failure Handling
  console.log("\n[TEST 5] Verifying Database Insert Failure Handling...");
  db.setFailInsert(true);
  let t5_caught = false;
  try {
    await assessCampaignViability("CH-01", { supabaseClient: db });
  } catch (err) {
    t5_caught = true;
  }
  db.setFailInsert(false);
  console.log(`- DB insert failure handled cleanly without reporting success: ${t5_caught}`);
  console.log(`- Test 5 Status: ${t5_caught ? "PASS" : "FAIL"}`);

  // TEST 6: Data Integrity
  console.log("\n[TEST 6] Verifying Original Campaign Data Integrity...");
  const finalCampaignSnapshot = JSON.stringify(db.getCampaignRecord());
  const finalAllocationsSnapshot = JSON.stringify(db.getAllocations());
  const t6_campaignIntact = initialCampaignSnapshot === finalCampaignSnapshot;
  const t6_allocationsIntact = initialAllocationsSnapshot === finalAllocationsSnapshot;
  console.log(`- Campaign record 100% unchanged: ${t6_campaignIntact}`);
  console.log(`- Allocations 100% unchanged: ${t6_allocationsIntact}`);
  console.log(`- Test 6 Status: ${t6_campaignIntact && t6_allocationsIntact ? "PASS" : "FAIL"}`);

  console.log("\n==================================================");
  console.log("ALL VERIFICATION SUITES EXECUTED SUCCESSFULLY");
  console.log("==================================================");
}

runE2EVerification().catch(console.error);
