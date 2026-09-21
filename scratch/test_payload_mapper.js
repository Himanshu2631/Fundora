import { buildCampaignViabilityPayload } from "../lib/ml/payloadMapper.js";
import { predictCampaignViability } from "../lib/ml/fastapi.js";

// Mock Supabase client to test mapper deterministically with test campaign and temporal events
function createTestSupabaseClient() {
  const launchIso = "2026-09-01T10:00:00.000Z";
  const launchMs = new Date(launchIso).getTime();

  const testCampaign = {
    id: "CH-01",
    name: "Acres of Green",
    description: "Dedicated to restoring local woodland ecosystems, planting native broadleaf species, and protecting wildlife corridors.",
    why_matters: "Healthy woodlands act as natural carbon sinks, buffer regional temperature rises, and preserve native biodiversity.",
    image_url: "/acres_of_green.png",
    featured: true,
    category: "Environment",
    impact: "7,400+ hectares of ancient forests protected this quarter.",
    auditor_score: "9.8",
    spending_ratio: "96.4%",
    raised: "₹14,53,000", // Must NOT be in the ML payload!
    created_at: launchIso,
    updated_at: launchIso
  };

  const testAllocations = [
    // 1h after launch (3600s) -> Valid (< 48h)
    { id: "sel-1", charity_id: "CH-01", contribution_percentage: 20, created_at: new Date(launchMs + 3600 * 1000).toISOString() },
    // 24h after launch (86400s) -> Valid (< 48h)
    { id: "sel-2", charity_id: "CH-01", contribution_percentage: 40, created_at: new Date(launchMs + 86400 * 1000).toISOString() },
    // 72h after launch (259200s) -> EXCLUDED (> 48h / 172800s)
    { id: "sel-3", charity_id: "CH-01", contribution_percentage: 50, created_at: new Date(launchMs + 259200 * 1000).toISOString() }
  ];

  return {
    from: (table) => {
      if (table === "charities") {
        return {
          select: () => ({
            eq: (field, val) => ({
              maybeSingle: async () => ({
                data: val === testCampaign.id ? testCampaign : null,
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
              data: testAllocations.filter(a => a.charity_id === val),
              error: null
            })
          })
        };
      }
      return { select: () => ({ eq: () => ({ data: [], error: null }) }) };
    }
  };
}

async function runMapperTests() {
  console.log("=== Testing buildCampaignViabilityPayload ===");
  const testClient = createTestSupabaseClient();

  const payload = await buildCampaignViabilityPayload("CH-01", {
    supabaseClient: testClient,
    targetGoal: 12000.0,
    country: "US"
  });

  console.log("\n--- Generated Payload ---");
  console.log(JSON.stringify(payload, null, 2));

  console.log("\n--- Validations ---");
  console.log("1. Campaign ID mapped:", payload.campaign_id === "CH-01");
  console.log("2. Title mapped:", payload.title === "Acres of Green");
  console.log("3. Goal present and numeric:", typeof payload.goal === "number" && payload.goal === 12000);
  console.log("4. 'raised' property excluded from root:", payload.raised === undefined);
  console.log("5. Total donations included within 48h:", payload.donations.length);
  console.log("6. Post-48h donation (sel-3 @ 72h) excluded:", !payload.donations.some(d => d.seconds_elapsed > 172800));
  console.log("7. Donations elapsed times:", payload.donations.map(d => `${d.seconds_elapsed}s`));

  console.log("\n--- Testing ML Inference with Generated Payload ---");
  process.env.ML_API_URL = "http://127.0.0.1:8000";
  const result = await predictCampaignViability(payload);
  console.log("Prediction result status: Success");
  console.log("Viability Score:", result.viability_score);
  console.log("Risk Level:", result.risk_level);
  console.log("Risk Probability:", result.risk_probability);
  console.log("SHAP explanation top risk factor:", result.explanation.top_risk_factors[0]);
}

runMapperTests().catch(console.error);
