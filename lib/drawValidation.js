/**
 * Validate monthly prize draw parameters.
 * @param {object} draw - The draw object.
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validateDraw(draw) {
  if (!draw) {
    return { isValid: false, error: "Draw data is required." };
  }
  if (!draw.title || typeof draw.title !== "string" || draw.title.trim() === "") {
    return { isValid: false, error: "Draw title is required." };
  }
  if (!draw.prize || typeof draw.prize !== "string" || draw.prize.trim() === "") {
    return { isValid: false, error: "Draw prize is required." };
  }
  const month = parseInt(draw.month, 10);
  if (isNaN(month) || month < 1 || month > 12) {
    return { isValid: false, error: "Draw month must be an integer between 1 and 12." };
  }
  const year = parseInt(draw.year, 10);
  if (isNaN(year) || year < 2026) {
    return { isValid: false, error: "Draw year must be an integer greater than or equal to 2026." };
  }
  const minScore = parseInt(draw.min_score, 10);
  if (isNaN(minScore) || minScore < 0) {
    return { isValid: false, error: "Minimum score requirement must be a non-negative integer." };
  }
  const validStatuses = ["upcoming", "active", "completed"];
  if (!validStatuses.includes(draw.status)) {
    return { isValid: false, error: `Draw status must be one of: ${validStatuses.join(", ")}.` };
  }
  return { isValid: true };
}

/**
 * Validate user eligibility to enter a draw.
 * @param {number} userGivingScore - User's current computed giving score.
 * @param {number} drawMinScore - Draw's required minimum score.
 * @param {string} subscriptionStatus - User's active subscription status ('active' or 'cancelled').
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validateDrawEntry(userGivingScore, drawMinScore, subscriptionStatus) {
  const scoreNum = parseInt(userGivingScore, 10);
  const minScoreNum = parseInt(drawMinScore, 10);

  if (subscriptionStatus !== "active" && subscriptionStatus !== "cancelled") {
    return { isValid: false, error: "An active subscription is required to participate in reward draws." };
  }
  if (isNaN(scoreNum) || scoreNum < minScoreNum) {
    return { 
      isValid: false, 
      error: `Your Giving Score (${scoreNum} pts) does not meet the minimum requirement for this draw (${minScoreNum} pts).` 
    };
  }
  return { isValid: true };
}

/**
 * Validate winning numbers lists.
 * @param {Array|string} winningNumbers - Winning ticket numbers list.
 * @returns {object} { isValid: boolean, error?: string }
 */
export function validateWinningNumbers(winningNumbers) {
  if (!winningNumbers) {
    return { isValid: false, error: "Winning numbers are required." };
  }
  if (Array.isArray(winningNumbers)) {
    if (winningNumbers.length === 0) {
      return { isValid: false, error: "At least one winning ticket must be specified." };
    }
    const hasInvalid = winningNumbers.some(num => typeof num !== "string" || num.trim() === "");
    if (hasInvalid) {
      return { isValid: false, error: "All winning tickets must be non-empty strings." };
    }
  } else if (typeof winningNumbers === "string") {
    if (winningNumbers.trim() === "") {
      return { isValid: false, error: "Winning numbers string cannot be empty." };
    }
  } else {
    return { isValid: false, error: "Winning numbers must be an array of strings or comma-separated string." };
  }
  return { isValid: true };
}

/**
 * Validate user eligibility to participate in any prize draws.
 * Checks active subscription status, at least one registered score round, and at least one charity allocation.
 * @param {string} subscriptionStatus - Plan status ('active', 'cancelled', 'expired', 'inactive').
 * @param {number} scoreCount - Total logged user scores count.
 * @param {number} allocationCount - Total selected user charities allocation count.
 * @returns {object} { isEligible: boolean, reasons: Array<string> }
 */
export function checkEligibility(subscriptionStatus, scoreCount, allocationCount) {
  const reasons = [];
  
  const hasActiveSub = subscriptionStatus === "active" || subscriptionStatus === "cancelled";
  if (!hasActiveSub) {
    reasons.push("No active subscription");
  }
  
  if (scoreCount <= 0) {
    reasons.push("Missing score submissions");
  }
  
  if (allocationCount <= 0) {
    reasons.push("Charity not selected");
  }

  return {
    isEligible: reasons.length === 0,
    reasons
  };
}
