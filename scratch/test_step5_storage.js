import { assessCampaignViability } from "../lib/ml/assessmentService.js";

function createMockSupabaseDatabase() {
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
    { id: "sel-1", charity_id: "CH-01", contribution_percentage: 20, created_at: new Date(launchMs + 3600 * 1000).toISOString() },
    { id: "sel-2", charity_id: "CH-01", contribution_percentage: 30, created_at: new Date(launchMs + 72000 * 1000).toISOString() },
    { id: "sel-3", charity_id: "CH-01", contribution_percentage: 40, created_at: new Date(launchMs + 250000 * 1000).toISOString() } // >48h
  ];

  const storedAssessments = [];

  return {
    getStoredAssessments: () => storedAssessments,
    getCampaignRecord: () => campaignRecord,
    getAllocations: () => allocations,
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
            const created = {
              id: "assess-uuid-" + (storedAssessments.length + 1),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
              ...record
            };
            storedAssessments.push(created);
            return {
              select: () => ({
                single: async () => ({ data: created, error: null }),
                maybeSingle: async () => ({ data: created, error: null }),
                then: async (resolve) => resolve({ data: [created], error: null })
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

async function runStep5Tests() {
  process.env.ML_API_URL = "http://127.0.0.1:8000";

  console.log("=== PHASE 4.2 STEP 5: STORE VIABILITY ASSESSMENT TESTS ===");
  const db = createMockSupabaseDatabase();

  const originalCampaign = JSON.stringify(db.getCampaignRecord());
  const originalAllocations = JSON.stringify(db.getAllocations());

  console.log("\n--- TEST 1: Successful Assessment & Storage Flow ---");
  const result = await assessCampaignViability("CH-01", {
    supabaseClient: db,
    targetGoal: 10000.0,
    country: "US"
  });

  console.log("Result success:", result.success);
  console.log("Stored Assessment ID:", result.assessment_id);
  console.log("Stored At Timestamp:", result.stored_at);
  console.log("Viability Score:", result.prediction.viability_score);
  console.log("Risk Level:", result.prediction.risk_level);
  console.log("Risk Probability:", result.prediction.risk_probability);

  const storedRows = db.getStoredAssessments();
  console.log("\nStored Assessments in Supabase Table Count:", storedRows.length);
  const row = storedRows[0];

  console.log("\n--- Database Row Content Verification ---");
  console.log("1. Row ID exists:", Boolean(row.id));
  console.log("2. campaign_id references CH-01:", row.campaign_id === "CH-01");
  console.log("3. risk_probability matches prediction:", row.risk_probability === Math.round(result.prediction.risk_probability * 10000) / 10000);
  console.log("4. viability_score matches prediction:", row.viability_score === result.prediction.viability_score);
  console.log("5. risk_level matches prediction:", row.risk_level === result.prediction.risk_level);
  console.log("6. model_name stored:", row.model_name);
  console.log("7. n_features = 56:", row.n_features === 56);
  console.log("8. calibration stored:", row.calibration);
  console.log("9. base_rate_risk stored:", row.base_rate_risk);
  console.log("10. top_risk_factors count:", row.top_risk_factors.length);
  console.log("11. top_supporting_factors count:", row.top_supporting_factors.length);
  console.log("12. detailed_risk_factors stored:", row.detailed_risk_factors.length > 0);
  console.log("13. research_disclaimer stored:", Boolean(row.research_disclaimer));

  const postCampaign = JSON.stringify(db.getCampaignRecord());
  const postAllocations = JSON.stringify(db.getAllocations());
  console.log("\n--- Integrity Validations ---");
  console.log("Campaign table unmodified:", originalCampaign === postCampaign ? "YES" : "NO");
  console.log("Allocations table unmodified:", originalAllocations === postAllocations ? "YES" : "NO");

  console.log("\n--- TEST 2: Failed FastAPI → No DB Row Created ---");
  const countBeforeFail = db.getStoredAssessments().length;
  process.env.ML_API_URL = "http://127.0.0.1:9999"; // Non-existent port

  let caughtError = null;
  try {
    await assessCampaignViability("CH-01", {
      supabaseClient: db,
      targetGoal: 10000.0
    });
  } catch (err) {
    caughtError = err;
  }

  process.env.ML_API_URL = "http://127.0.0.1:8000"; // Restore URL
  const countAfterFail = db.getStoredAssessments().length;

  console.log("Error caught gracefully:", Boolean(caughtError));
  console.log("Error message:", caughtError?.message);
  console.log("Database rows added during failure:", countAfterFail - countBeforeFail === 0 ? "0 (PASSED)" : "FAILED");
}

runStep5Tests().catch(console.error);
