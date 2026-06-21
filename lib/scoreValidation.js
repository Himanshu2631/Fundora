/**
 * Validate a score entry.
 * @param {object} params
 * @param {number|string} params.score - The score value.
 * @param {string} params.scoreDate - The date of the score (YYYY-MM-DD).
 * @param {Array} params.existingScores - The user's current score list.
 * @returns {{isValid: boolean, error: string|null}}
 */
export function validateScore({ score, scoreDate, existingScores }) {
  if (score === undefined || score === null || score === "") {
    return { isValid: false, error: "Score is required." };
  }
  
  const scoreNum = Number(score);
  if (isNaN(scoreNum) || !Number.isInteger(scoreNum) || scoreNum < 1 || scoreNum > 45) {
    return { isValid: false, error: "Score must be an integer between 1 and 45." };
  }
  
  if (!scoreDate) {
    return { isValid: false, error: "Date is mandatory." };
  }
  
  // Validate date format YYYY-MM-DD
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(scoreDate)) {
    return { isValid: false, error: "Date must be in YYYY-MM-DD format." };
  }

  // Check if date is valid
  const parsedDate = new Date(scoreDate);
  if (isNaN(parsedDate.getTime())) {
    return { isValid: false, error: "Invalid date value." };
  }

  // Duplicate date check: User may only have one score entry per date
  if (existingScores && Array.isArray(existingScores)) {
    const isDuplicate = existingScores.some(
      (s) => s.score_date === scoreDate
    );
    if (isDuplicate) {
      return { isValid: false, error: "A score entry already exists for this date." };
    }
  }

  return { isValid: true, error: null };
}
