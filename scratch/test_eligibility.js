import { isCampaignViabilityAssessmentEligible } from "../lib/ml/eligibilityService.js";

async function runEligibilityTests() {
  console.log("==================================================");
  console.log("PHASE 4.3 STEP 1: CAMPAIGN ELIGIBILITY UNIT TESTS");
  console.log("==================================================");

  const launchIso = "2026-09-01T10:00:00.000Z";
  const launchMs = new Date(launchIso).getTime();

  const baseCampaign = {
    id: "CH-ELIG-01",
    name: "Clean Air For Children",
    created_at: launchIso,
    status: "Active"
  };

  // CASE A: 47 hours 59 minutes (172,740 seconds) -> NOT ELIGIBLE
  const time47h59m = new Date(launchMs + (47 * 3600 + 59 * 60) * 1000);
  const resA = await isCampaignViabilityAssessmentEligible(baseCampaign, { now: time47h59m });
  console.log("\n[CASE A: 47h 59m Elapsed]");
  console.log("- Eligible:", resA.eligible);
  console.log("- Reason:", resA.reason);
  console.log("- Elapsed:", resA.elapsedSeconds);
  console.log("- Result:", resA.eligible === false ? "PASS (NOT ELIGIBLE)" : "FAIL");

  // CASE B: Exactly 48 hours 00 minutes (172,800 seconds) -> ELIGIBLE
  const time48h00m = new Date(launchMs + 48 * 3600 * 1000);
  const resB = await isCampaignViabilityAssessmentEligible(baseCampaign, { now: time48h00m });
  console.log("\n[CASE B: Exactly 48h 00m Elapsed]");
  console.log("- Eligible:", resB.eligible);
  console.log("- Reason:", resB.reason);
  console.log("- Elapsed:", resB.elapsedSeconds);
  console.log("- Result:", resB.eligible === true ? "PASS (ELIGIBLE)" : "FAIL");

  // CASE C: 48 hours 01 minute (172,860 seconds) -> ELIGIBLE
  const time48h01m = new Date(launchMs + (48 * 3600 + 60) * 1000);
  const resC = await isCampaignViabilityAssessmentEligible(baseCampaign, { now: time48h01m });
  console.log("\n[CASE C: 48h 01m Elapsed]");
  console.log("- Eligible:", resC.eligible);
  console.log("- Reason:", resC.reason);
  console.log("- Elapsed:", resC.elapsedSeconds);
  console.log("- Result:", resC.eligible === true ? "PASS (ELIGIBLE)" : "FAIL");

  // CASE D: Unlaunched campaign (future launch date) -> NOT ELIGIBLE
  const futureLaunchCampaign = {
    id: "CH-ELIG-02",
    name: "Future Initiative",
    created_at: "2026-09-05T10:00:00.000Z",
    status: "Active"
  };
  const resD = await isCampaignViabilityAssessmentEligible(futureLaunchCampaign, { now: launchIso });
  console.log("\n[CASE D: Unlaunched Campaign]");
  console.log("- Eligible:", resD.eligible);
  console.log("- Reason:", resD.reason);
  console.log("- Result:", resD.eligible === false ? "PASS (NOT ELIGIBLE)" : "FAIL");

  // CASE E: Already has 48-hour assessment -> NOT ELIGIBLE
  const resE = await isCampaignViabilityAssessmentEligible(baseCampaign, {
    now: time48h01m,
    hasExistingAssessment: true
  });
  console.log("\n[CASE E: Already Assessed Campaign]");
  console.log("- Eligible:", resE.eligible);
  console.log("- Reason:", resE.reason);
  console.log("- Result:", resE.eligible === false ? "PASS (NOT ELIGIBLE)" : "FAIL");

  // CASE F: Missing or invalid launch timestamp -> NOT ELIGIBLE
  const invalidTimeCampaign = {
    id: "CH-ELIG-03",
    name: "Corrupt Timestamp Campaign",
    created_at: "invalid-date-string"
  };
  const resF = await isCampaignViabilityAssessmentEligible(invalidTimeCampaign, { now: time48h01m });
  console.log("\n[CASE F: Invalid Timestamp Campaign]");
  console.log("- Eligible:", resF.eligible);
  console.log("- Reason:", resF.reason);
  console.log("- Result:", resF.eligible === false ? "PASS (NOT ELIGIBLE)" : "FAIL");

  // CASE G: Cancelled/Draft campaign status -> NOT ELIGIBLE
  const cancelledCampaign = {
    id: "CH-ELIG-04",
    name: "Cancelled Campaign",
    created_at: launchIso,
    status: "Cancelled"
  };
  const resG = await isCampaignViabilityAssessmentEligible(cancelledCampaign, { now: time48h01m });
  console.log("\n[CASE G: Cancelled Status Campaign]");
  console.log("- Eligible:", resG.eligible);
  console.log("- Reason:", resG.reason);
  console.log("- Result:", resG.eligible === false ? "PASS (NOT ELIGIBLE)" : "FAIL");
}

runEligibilityTests().catch(console.error);
