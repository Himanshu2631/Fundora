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
