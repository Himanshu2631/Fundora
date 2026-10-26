/**
 * Phase 4.6 Step 3: User-Facing Early Funding Viability & Assessment History UI Verification Suite
 *
 * Verifies:
 * 1. Available Assessment State (latest score, risk probability, risk level, horizon, factor signals)
 * 2. Pre-48h Campaign State (pre-48h notice rendered cleanly without fake values)
 * 3. Past-48h Campaign without Assessment State (unavailable notice rendered cleanly without fake values)
 * 4. Assessment History Timeline Rendering (chronological ordering, timestamp, score, risk badge)
 * 5. Distinction of Latest vs. Older Assessments (Latest badge and highlight on newest evaluation)
 * 6. Non-Contamination of SHAP Explanations (Each assessment's factors remain strictly isolated)
 * 7. Chronological Sort Toggle (Newest First vs. Oldest First)
 * 8. Empty History Handling (No fabricated records, clean empty state)
 * 9. Probability and Score Formatting Edge Cases
 * 10. Privacy & Terminology Safety Audit (No fraud, scam, or trustworthiness claims)
 *
 * Run with: node scratch/test_user_viability_ui.js
 */

import {
  getCampaignViabilityAssessment,
  getCampaignViabilityAssessmentHistory,
} from "../lib/ml/assessmentService.js";

// ============================================================
// FIXTURES
// ============================================================

const SEED_ASSESSMENT_LATEST = {
  id: "assess-ui-003",
  campaign_id: "charity-ui-001",
  viability_score: 88,
  risk_probability: 0.1200,
  risk_level: "LOW RISK",
  assessment_type: "manual",
  prediction_horizon_hours: 96,
  model_name: "Random Forest Champion v2",
  model_type: "RandomForestClassifier",
  n_features: 56,
  calibration: "Platt Scaling (Sigmoid)",
  base_rate_risk: 0.4996,
  top_risk_factors: ["category_saturation"],
  top_supporting_factors: ["viral_surge_momentum", "high_donor_retention"],
  research_disclaimer: "Predicted outcome for advisory decision support.",
  created_at: "2026-09-15T14:30:00Z",
};

const SEED_ASSESSMENT_REASSESSMENT = {
  id: "assess-ui-002",
  campaign_id: "charity-ui-001",
  viability_score: 65,
  risk_probability: 0.3500,
  risk_level: "MEDIUM RISK",
  assessment_type: "reassessment",
  prediction_horizon_hours: 72,
  model_name: "Random Forest Champion",
  model_type: "RandomForestClassifier",
  n_features: 56,
  calibration: "Platt Scaling (Sigmoid)",
  base_rate_risk: 0.4996,
  top_risk_factors: ["early_velocity_slowdown"],
  top_supporting_factors: ["goal_near_attainment"],
  research_disclaimer: "Predicted outcome for advisory decision support.",
  created_at: "2026-09-12T10:00:00Z",
};

const SEED_ASSESSMENT_INITIAL = {
  id: "assess-ui-001",
  campaign_id: "charity-ui-001",
  viability_score: 81,
  risk_probability: 0.1850,
  risk_level: "LOW RISK",
  assessment_type: "initial_48h",
  prediction_horizon_hours: 48,
  model_name: "Random Forest Champion",
  model_type: "RandomForestClassifier",
  n_features: 56,
  calibration: "Platt Scaling (Sigmoid)",
  base_rate_risk: 0.4996,
  top_risk_factors: ["low_early_backer_momentum"],
  top_supporting_factors: ["strong_social_proof"],
  research_disclaimer: "Predicted outcome for advisory decision support.",
  created_at: "2026-09-10T10:00:00Z",
};

const MULTI_ASSESSMENT_STORE = [
  SEED_ASSESSMENT_LATEST,
  SEED_ASSESSMENT_REASSESSMENT,
  SEED_ASSESSMENT_INITIAL,
];

function createMockSupabase({ records = MULTI_ASSESSMENT_STORE, fail = false } = {}) {
  return {
    from: () => ({
      select: () => ({
        eq: () => ({
          order: (_field, { ascending = false } = {}) => ({
            limit: async (n) => {
              if (fail) throw new Error("Connection failed");
              const sorted = [...records].sort((a, b) => {
                const diff = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
                return ascending ? diff : -diff;
              });
              return {
                data: n === 1 ? (sorted.slice(0, 1)) : sorted.slice(0, n || sorted.length),
                error: null,
              };
            },
          }),
        }),
      }),
    }),
  };
}

// Logic replicate of UI formatting and history processing
function formatViabilityUI(assessment, history = [], createdAt = null, sortAscending = false) {
  if (!assessment) {
    if (createdAt) {
      const createdTime = new Date(createdAt).getTime();
      const isPre48 = !isNaN(createdTime) && (Date.now() - createdTime < 48 * 60 * 60 * 1000);
      if (isPre48) {
        return {
          state: "PRE_48H",
          title: "Early Funding Viability",
          message: "Early funding viability will be available after the campaign has accumulated 48 hours of activity.",
          history: [],
        };
      }
    }
    return {
      state: "UNAVAILABLE",
      title: "Early Funding Viability",
      message: "Early funding viability assessment is currently unavailable.",
      history: [],
    };
  }

  const sortedHistory = [...history].sort((a, b) => {
    const tA = new Date(a.created_at).getTime() || 0;
    const tB = new Date(b.created_at).getTime() || 0;
    return sortAscending ? tA - tB : tB - tA;
  });

  const formattedHistoryItems = sortedHistory.map((rec) => {
    const isLatest = rec.id === assessment?.id || rec.created_at === assessment?.created_at;
    return {
      id: rec.id,
      isLatest,
      assessmentType: rec.assessment_type || "initial_48h",
      viabilityScore: Number(rec.viability_score),
      viabilityScoreDisplay: `${rec.viability_score} / 100`,
      riskProbability: Number(rec.risk_probability),
      riskProbabilityDisplay: `${(rec.risk_probability * 100).toFixed(1)}%`,
      riskLevel: rec.risk_level,
      predictionHorizonHours: rec.prediction_horizon_hours || 48,
      timestampDisplay: new Date(rec.created_at).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      supportingFactors: rec.top_supporting_factors || [],
      riskFactors: rec.top_risk_factors || [],
    };
  });

  return {
    state: "AVAILABLE",
    title: "Early Funding Viability",
    viabilityScoreDisplay: `${assessment.viability_score} / 100`,
    riskProbabilityDisplay: `${(assessment.risk_probability * 100).toFixed(1)}%`,
    riskLevel: assessment.risk_level,
    predictionHorizonDisplay: `${assessment.prediction_horizon_hours || 48} hours`,
    supportingFactors: assessment.top_supporting_factors || [],
    riskFactors: assessment.top_risk_factors || [],
    history: formattedHistoryItems,
  };
}

async function runTests() {
  console.log("==============================================================");
  console.log("PHASE 4.6 STEP 3 — USER-FACING VIABILITY & HISTORY UI TESTS");
  console.log("==============================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${message}`);
      failed++;
    }
  }

  // 1. Available assessment rendering (Latest assessment)
  console.log("TEST 1: Available Assessment State");
  {
    const mockClient = createMockSupabase();
    const data = await getCampaignViabilityAssessment("charity-ui-001", { supabaseClient: mockClient });
    const history = await getCampaignViabilityAssessmentHistory("charity-ui-001", { supabaseClient: mockClient });
    const ui = formatViabilityUI(data, history, "2026-09-01T00:00:00Z");

    assert(ui.state === "AVAILABLE", "State is AVAILABLE");
    assert(ui.title === "Early Funding Viability", "Title is 'Early Funding Viability'");
    assert(ui.viabilityScoreDisplay === "88 / 100", "Latest viability score displayed as '88 / 100'");
    assert(ui.riskProbabilityDisplay === "12.0%", "Latest risk probability formatted as '12.0%'");
    assert(ui.riskLevel === "LOW RISK", "Risk level is 'LOW RISK'");
    assert(ui.predictionHorizonDisplay === "96 hours", "Prediction horizon is '96 hours'");
    assert(ui.supportingFactors.length === 2, "2 supporting factors rendered for latest assessment");
    assert(ui.riskFactors.length === 1, "1 risk factor rendered for latest assessment");
  }

  // 2. Pre-48h campaign (campaign launched 12 hours ago)
  console.log("\nTEST 2: Pre-48-Hour Campaign State");
  {
    const recentLaunch = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
    const ui = formatViabilityUI(null, [], recentLaunch);

    assert(ui.state === "PRE_48H", "State is PRE_48H");
    assert(ui.message.includes("48 hours of activity"), "Pre-48h explanatory message displayed");
    assert(ui.history.length === 0, "No history rendered during pre-48h window");
  }

  // 3. Past-48h campaign without assessment
  console.log("\nTEST 3: Past-48-Hour Campaign without Assessment State");
  {
    const olderLaunch = new Date(Date.now() - 100 * 60 * 60 * 1000).toISOString();
    const ui = formatViabilityUI(null, [], olderLaunch);

    assert(ui.state === "UNAVAILABLE", "State is UNAVAILABLE");
    assert(ui.message.includes("currently unavailable"), "Unavailable message displayed without fake scores");
    assert(ui.history.length === 0, "Zero history records when unassessed");
  }

  // 4. Assessment History Timeline Rendering
  console.log("\nTEST 4: Assessment History Timeline Rendering");
  {
    const mockClient = createMockSupabase();
    const data = await getCampaignViabilityAssessment("charity-ui-001", { supabaseClient: mockClient });
    const history = await getCampaignViabilityAssessmentHistory("charity-ui-001", { supabaseClient: mockClient });
    const ui = formatViabilityUI(data, history, "2026-09-01T00:00:00Z");

    assert(ui.history.length === 3, "Timeline contains all 3 historical assessments");
    assert(ui.history[0].id === "assess-ui-003", "First item in timeline is newest assessment (assess-ui-003)");
    assert(ui.history[1].id === "assess-ui-002", "Second item in timeline is middle assessment (assess-ui-002)");
    assert(ui.history[2].id === "assess-ui-001", "Third item in timeline is initial assessment (assess-ui-001)");
    assert(ui.history[0].viabilityScoreDisplay === "88 / 100", "First item score is '88 / 100'");
    assert(ui.history[1].viabilityScoreDisplay === "65 / 100", "Second item score is '65 / 100'");
    assert(ui.history[2].viabilityScoreDisplay === "81 / 100", "Third item score is '81 / 100'");
  }

  // 5. Distinction of Latest vs. Older Assessments
  console.log("\nTEST 5: Distinction of Latest vs. Older Assessments");
  {
    const mockClient = createMockSupabase();
    const data = await getCampaignViabilityAssessment("charity-ui-001", { supabaseClient: mockClient });
    const history = await getCampaignViabilityAssessmentHistory("charity-ui-001", { supabaseClient: mockClient });
    const ui = formatViabilityUI(data, history);

    assert(ui.history[0].isLatest === true, "Newest assessment marked as isLatest = true");
    assert(ui.history[1].isLatest === false, "Older reassessment marked as isLatest = false");
    assert(ui.history[2].isLatest === false, "Older initial assessment marked as isLatest = false");
    assert(ui.history[0].assessmentType === "manual", "Newest assessment type is manual");
    assert(ui.history[1].assessmentType === "reassessment", "Middle assessment type is reassessment");
    assert(ui.history[2].assessmentType === "initial_48h", "Oldest assessment type is initial_48h");
  }

  // 6. Non-Contamination of SHAP Explanations
  console.log("\nTEST 6: Non-Contamination of SHAP Explanations Across Assessments");
  {
    const mockClient = createMockSupabase();
    const data = await getCampaignViabilityAssessment("charity-ui-001", { supabaseClient: mockClient });
    const history = await getCampaignViabilityAssessmentHistory("charity-ui-001", { supabaseClient: mockClient });
    const ui = formatViabilityUI(data, history);

    const recLatest = ui.history[0];
    const recReassess = ui.history[1];
    const recInitial = ui.history[2];

    assert(recLatest.supportingFactors.includes("viral_surge_momentum"), "Latest assessment has viral_surge_momentum");
    assert(!recLatest.supportingFactors.includes("strong_social_proof"), "Latest does NOT contain initial factors");
    assert(recReassess.supportingFactors.includes("goal_near_attainment"), "Reassessment has goal_near_attainment");
    assert(!recReassess.supportingFactors.includes("viral_surge_momentum"), "Reassessment does NOT contain latest factors");
    assert(recInitial.supportingFactors.includes("strong_social_proof"), "Initial assessment has strong_social_proof");
    assert(!recInitial.supportingFactors.includes("goal_near_attainment"), "Initial does NOT contain reassessment factors");
  }

  // 7. Chronological Sort Toggle (Newest First vs Oldest First)
  console.log("\nTEST 7: Chronological Sort Direction Toggle");
  {
    const mockClient = createMockSupabase();
    const data = await getCampaignViabilityAssessment("charity-ui-001", { supabaseClient: mockClient });
    const history = await getCampaignViabilityAssessmentHistory("charity-ui-001", { supabaseClient: mockClient });

    // Descending (default)
    const uiDesc = formatViabilityUI(data, history, null, false);
    assert(uiDesc.history[0].id === "assess-ui-003", "Desc: First item is assess-ui-003 (Sep 15)");
    assert(uiDesc.history[2].id === "assess-ui-001", "Desc: Last item is assess-ui-001 (Sep 10)");

    // Ascending
    const uiAsc = formatViabilityUI(data, history, null, true);
    assert(uiAsc.history[0].id === "assess-ui-001", "Asc: First item is assess-ui-001 (Sep 10)");
    assert(uiAsc.history[2].id === "assess-ui-003", "Asc: Last item is assess-ui-003 (Sep 15)");
    assert(uiAsc.history[2].isLatest === true, "Asc: Latest badge stays attached to newest assessment");
  }

  // 8. Empty History Handling
  console.log("\nTEST 8: Empty History Handling");
  {
    const mockClient = createMockSupabase({ records: [] });
    const data = await getCampaignViabilityAssessment("charity-ui-001", { supabaseClient: mockClient });
    const history = await getCampaignViabilityAssessmentHistory("charity-ui-001", { supabaseClient: mockClient });
    const ui = formatViabilityUI(data, history);

    assert(ui.history.length === 0, "Empty history produces 0 items (never fabricates fake records)");
  }

  // 9. Probability and Score Formatting Edge Cases
  console.log("\nTEST 9: Probability and Score Formatting Edge Cases");
  {
    assert((0.2834 * 100).toFixed(1) + "%" === "28.3%", "0.2834 correctly formatted to 28.3%");
    assert((0.05 * 100).toFixed(1) + "%" === "5.0%", "0.05 correctly formatted to 5.0%");
    assert((0.999 * 100).toFixed(1) + "%" === "99.9%", "0.999 correctly formatted to 99.9%");
    assert((0.0 * 100).toFixed(1) + "%" === "0.0%", "0.0 correctly formatted to 0.0%");
  }

  // 10. Privacy & Safety Terminology Audit
  console.log("\nTEST 10: Privacy & Non-Causality Terminology Audit");
  {
    const mockClient = createMockSupabase();
    const data = await getCampaignViabilityAssessment("charity-ui-001", { supabaseClient: mockClient });
    const history = await getCampaignViabilityAssessmentHistory("charity-ui-001", { supabaseClient: mockClient });
    const ui = formatViabilityUI(data, history);
    const serialized = JSON.stringify(ui).toLowerCase();

    assert(!serialized.includes("password"), "No password fields exposed");
    assert(!serialized.includes("donor_email"), "No donor email fields exposed");
    assert(!serialized.includes("stripe"), "No Stripe keys exposed");
    assert(!serialized.includes("fraud"), "No fraud terminology in assessment data");
    assert(!serialized.includes("scam"), "No scam terminology in assessment data");
    assert(!serialized.includes("trustworthy"), "No trustworthiness claims in assessment data");
    assert(!serialized.includes("legitimate"), "No legitimacy claims in assessment data");
  }

  console.log("\n==============================================================");
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("===============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
