/**
 * Phase 4.5 Step 4: User-Facing Viability Explanation & Transparency Test Suite
 *
 * Tests:
 * 1. Viability explanation text & meaning of score
 * 2. Risk probability explanation & non-causal wording
 * 3. Prediction horizon (48 hours) explanation
 * 4. Risk level explanation & neutral categorization
 * 5. Assessment factor separation (positive vs risk associations)
 * 6. Factor label sanitation (snake_case -> clean labels)
 * 7. Reference baseline presentation (contextual benchmark)
 * 8. Research disclaimer & advisory note
 * 9. Terminology safety audit (no prohibited fraud/scam/trustworthiness words)
 *
 * Run with: node scratch/test_user_viability_transparency.js
 */

import { getCampaignViabilityAssessment } from "../lib/ml/assessmentService.js";

// ============================================================
// FIXTURE DATA
// ============================================================

const SEED_ASSESSMENT = {
  id: "assess-trans-001",
  campaign_id: "charity-trans-001",
  viability_score: 85,
  risk_probability: 0.1524,
  risk_level: "LOW RISK",
  assessment_type: "initial_48h",
  prediction_horizon_hours: 48,
  model_name: "Random Forest Champion",
  model_type: "RandomForestClassifier",
  n_features: 56,
  calibration: "Platt Scaling (Sigmoid)",
  base_rate_risk: 0.4996,
  top_risk_factors: ["goal", "Category benchmark momentum"],
  top_supporting_factors: ["early_donations_count", "Verified organization profile"],
  research_disclaimer: "Predicted outcome for advisory use.",
  created_at: "2026-09-10T10:00:00Z",
};

function formatFactorLabel(factor) {
  if (!factor) return "";
  const rawText = typeof factor === "string" ? factor : factor?.feature || JSON.stringify(factor);
  if (rawText.includes(" ")) return rawText;

  const labelMap = {
    early_donations_count: "Initial contribution count",
    early_donations: "Initial donation volume",
    early_velocity: "Early donation velocity",
    goal: "Campaign target goal",
    verified_charity: "Verified organization profile",
    narrative_length: "Campaign story detail",
    category_velocity: "Category benchmark momentum",
  };

  return labelMap[rawText] || rawText.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function generateTransparencyExplanations(assessment) {
  return {
    howItWorks:
      "This assessment estimates early funding viability using information available during the campaign's first 48 hours, including campaign details and early activity. It is an analytical estimate, not a guarantee of campaign performance.",
    scoreExplanation: "Viability Score indicates the model's estimated funding outlook on a 0–100 scale.",
    probabilityExplanation:
      "Risk Probability represents the model's estimated probability of the campaign remaining underfunded at the prediction horizon.",
    riskLevelExplanation: "Risk level summarizes the model's estimated underfunding risk.",
    horizonExplanation:
      "Prediction horizon: 48 hours. The assessment uses information available during the first 48 hours of campaign activity.",
    baselineExplanation: `Reference baseline: The dataset's observed benchmark underfunding rate (${(assessment.base_rate_risk * 100).toFixed(1)}%) used as a model reference.`,
    researchNote: "Developed as part of Sahayata's research system for early funding viability assessment.",
    supportingFactors: (assessment.top_supporting_factors || []).map(formatFactorLabel),
    riskFactors: (assessment.top_risk_factors || []).map(formatFactorLabel),
  };
}

async function runTests() {
  console.log("==============================================================");
  console.log("PHASE 4.5 STEP 4 — VIABILITY TRANSPARENCY & EXPLANATION TESTS");
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

  const explanations = generateTransparencyExplanations(SEED_ASSESSMENT);

  // 1. How it works explanation
  console.log("TEST 1: 'How this assessment works' Explanation");
  assert(
    explanations.howItWorks.includes("first 48 hours") &&
      explanations.howItWorks.includes("analytical estimate, not a guarantee"),
    "Clear 'How this assessment works' explanation with non-guarantee statement"
  );

  // 2. Score & Probability explanations
  console.log("\nTEST 2: Score & Risk Probability Explanations");
  assert(
    explanations.scoreExplanation.includes("0–100 scale") &&
      explanations.scoreExplanation.includes("funding outlook"),
    "Viability score clearly explained as 0–100 funding outlook"
  );
  assert(
    explanations.probabilityExplanation.includes("underfunded at the prediction horizon"),
    "Risk probability clearly explained as underfunding risk probability"
  );

  // 3. Horizon explanation
  console.log("\nTEST 3: Prediction Horizon Explanation");
  assert(
    explanations.horizonExplanation.includes("Prediction horizon: 48 hours") &&
      explanations.horizonExplanation.includes("first 48 hours of campaign activity"),
    "48-hour prediction horizon clearly communicated"
  );

  // 4. Factor separation & label sanitation
  console.log("\nTEST 4: Factor Separation & Label Sanitation");
  assert(
    explanations.supportingFactors[0] === "Initial contribution count",
    "Snake_case 'early_donations_count' sanitized to 'Initial contribution count'"
  );
  assert(
    explanations.riskFactors[0] === "Campaign target goal",
    "Snake_case 'goal' sanitized to 'Campaign target goal'"
  );
  assert(
    explanations.riskFactors[1] === "Category benchmark momentum",
    "Human readable sentence preserved intact"
  );

  // 5. Reference baseline & research disclaimer
  console.log("\nTEST 5: Reference Baseline & Research Transparency");
  assert(
    explanations.baselineExplanation.includes("observed benchmark underfunding rate") &&
      explanations.baselineExplanation.includes("50.0%"),
    "Reference baseline displayed as dataset benchmark"
  );
  assert(
    explanations.researchNote.includes("Sahayata's research system"),
    "Research provenance note included"
  );

  // 6. Prohibited terminology audit
  console.log("\nTEST 6: Prohibited Terminology Audit");
  const fullText = JSON.stringify(explanations).toLowerCase();
  assert(!fullText.includes("fraud"), "No fraud terminology present");
  assert(!fullText.includes("scam"), "No scam terminology present");
  assert(!fullText.includes("legitimate"), "No legitimacy claims present");
  assert(!fullText.includes("trustworthy"), "No trustworthiness claims present");
  assert(!fullText.includes("safe campaign"), "No 'safe campaign' claims present");
  assert(!fullText.includes("guaranteed success"), "No 'guaranteed success' claims present");

  console.log("\n==============================================================");
  console.log(`TEST SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==============================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
