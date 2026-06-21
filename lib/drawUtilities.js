/**
 * Calculate the number of tickets a user is entitled to based on subscription tier.
 * @param {string} tier - Subscription plan type ('scout', 'advocate', 'builder').
 * @returns {number} Ticket count multiplier.
 */
export function calculateTicketCount(tier) {
  switch (tier) {
    case "scout":
      return 1;
    case "advocate":
      return 3;
    case "builder":
      return 10;
    default:
      return 0;
  }
}

/**
 * Generate a unique and formatted ticket number.
 * Formats: FND-{shortUserId}-{shortDrawId}-{A/B/C...} matching actual UX design patterns.
 * @param {string} userId - User identifier.
 * @param {string} drawId - Draw identifier.
 * @param {number} index - Index of ticket (0-indexed).
 * @returns {string} The formatted ticket number.
 */
export function generateTicketNumber(userId, drawId, index) {
  if (!userId || !drawId) {
    throw new Error("userId and drawId are required to generate a ticket number.");
  }
  
  // Format short segments to uppercase alphanumeric
  const shortUser = userId.replace(/[^a-zA-Z0-9]/g, "").slice(-3).toUpperCase();
  const shortDraw = drawId.replace(/[^a-zA-Z0-9]/g, "").slice(-3).toUpperCase();
  
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const suffix = letters[index % letters.length] || "X";
  
  return `FND-${shortUser}-${shortDraw}${suffix}`;
}

/**
 * Check if a ticket number is a winning ticket.
 * @param {string} ticketNumber - User ticket number.
 * @param {Array|string} winningNumbers - Array of winning tickets or comma-separated string.
 * @returns {boolean} True if matching.
 */
export function isTicketWinning(ticketNumber, winningNumbers) {
  if (!ticketNumber || !winningNumbers) return false;
  const target = ticketNumber.trim().toUpperCase();

  if (Array.isArray(winningNumbers)) {
    return winningNumbers.map(n => n.trim().toUpperCase()).includes(target);
  }

  if (typeof winningNumbers === "string") {
    return winningNumbers
      .split(",")
      .map(n => n.trim().toUpperCase())
      .includes(target);
  }

  return false;
}

/**
 * Generate a sorted list of unique lottery numbers.
 * Enforces no duplicates and consistent sorting format.
 * @param {number} [count] - Amount of numbers to generate.
 * @param {number} [min] - Minimum number boundary.
 * @param {number} [max] - Maximum number boundary.
 * @returns {Array<number>} List of unique numbers.
 */
export function generateLotteryNumbers(count = 5, min = 1, max = 99) {
  const numbers = new Set();
  const range = max - min + 1;
  if (range < count) {
    throw new Error(`Cannot generate ${count} unique numbers from a range of size ${range}.`);
  }
  
  while (numbers.size < count) {
    const num = Math.floor(Math.random() * range) + min;
    numbers.add(num);
  }
  return Array.from(numbers).sort((a, b) => a - b);
}

/**
 * Calculate the count of matching numbers between a ticket and winning numbers.
 * @param {Array<number>} ticketNumbers - Ticket numbers array.
 * @param {Array<number>} winningNumbers - Winning numbers array.
 * @returns {number} The count of common matching numbers.
 */
export function calculateMatches(ticketNumbers, winningNumbers) {
  if (!Array.isArray(ticketNumbers) || !Array.isArray(winningNumbers)) {
    return 0;
  }
  return ticketNumbers.filter(num => winningNumbers.includes(num)).length;
}

/**
 * Map match count to standard prize category.
 * @param {number} matchCount - Calculated match count.
 * @returns {string|null} The winner category name or null if no win.
 */
export function getPrizeCategory(matchCount) {
  switch (matchCount) {
    case 5:
      return "5 Match";
    case 4:
      return "4 Match";
    case 3:
      return "3 Match";
    default:
      return null;
  }
}
