import { assessCampaignViability } from "../lib/ml/assessmentService.js";

// Test Supabase client representing existing database state for testing
function createTestClient() {
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
    raised: "₹14,53,000", // Must NOT be modified or passed to ML!
    created_at: launchIso,
    updated_at: launchIso
  };

  const allocations = [
    { id: "sel-1", charity_id: "CH-01", contribution_percentage: 20, created_at: new Date(launchMs + 3600 * 1000).toISOString() },
    { id: "sel-2", charity_id: "CH-01", contribution_percentage: 30, created_at: new Date(launchMs + 72000 * 1000).toISOString() }
  ];

  let insertCount = 0;

  return {
    getInsertCount: () => insertCount,
    getCampaignRecord: () => campaignRecord,
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
          insert: async (data) => {
            insertCount++;
            return { data, error: null };
          }
        };
      }
      return { select: () => ({ eq: () => ({ data: [], error: null }) }) };
    }
  };
}

async function runAssessmentTest() {
  console.log("=== Testing assessCampaignViability ===");
  process.env.ML_API_URL = "http://127.0.0.1:8000";

  const testClient = createTestClient();
  const campaignId = "CH-01";

  const originalRecord = JSON.stringify(testClient.getCampaignRecord());

  const prediction = await assessCampaignViability(campaignId, {
    supabaseClient: testClient,
    targetGoal: 10000.0,
    country: "US"
  });

  console.log("\n--- Received Prediction Object ---");
  console.log(JSON.stringify(prediction, null, 2));

  console.log("\n--- Field Validations ---");
  const hasCampaignId = prediction.campaign_id === campaignId;
  const hasProbability = typeof prediction.risk_probability === "number";
  const hasScore = typeof prediction.viability_score === "number";
  const hasRiskLevel = typeof prediction.risk_level === "string";
  const hasHorizon = prediction.prediction_horizon_hours === 48;
  const hasModel = prediction.model && typeof prediction.model.name === "string";
  const hasExplanation = prediction.explanation && Array.isArray(prediction.explanation.top_risk_factors);
  const hasDisclaimer = typeof prediction.research_disclaimer === "string";

  console.log("1. campaign_id matched:", hasCampaignId);
  console.log("2. risk_probability valid float:", hasProbability, `(${prediction.risk_probability})`);
  console.log("3. viability_score valid integer:", hasScore, `(${prediction.viability_score})`);
  console.log("4. risk_level valid string:", hasRiskLevel, `(${prediction.risk_level})`);
  console.log("5. prediction_horizon_hours = 48:", hasHorizon);
  console.log("6. model info present:", hasModel, `(${prediction.model.name})`);
  console.log("7. explanation with top_risk_factors present:", hasExplanation);
  console.log("8. research_disclaimer present:", hasDisclaimer);

  const postRecord = JSON.stringify(testClient.getCampaignRecord());
  const campaignUnmodified = originalRecord === postRecord;
  const zeroInserts = testClient.getInsertCount() === 0;

  console.log("\n--- Integrity Validations ---");
  console.log("9. Campaign data modified in DB:", !campaignUnmodified ? "YES" : "NO");
  console.log("10. Assessment record inserted into DB:", !zeroInserts ? "YES" : "NO");

  console.log("\n--- Overall Test Status ---");
  const allValid = hasCampaignId && hasProbability && hasScore && hasRiskLevel && hasHorizon && hasModel && hasExplanation && campaignUnmodified && zeroInserts;
  console.log(`Prediction Returned: ${allValid ? "PASS" : "FAIL"}`);
}

runAssessmentTest().catch(console.error);
