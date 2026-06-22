import { sendWinnerAlertNotificationEmail } from "../lib/email.js";

async function verify() {
  console.log("Testing sendWinnerAlertNotificationEmail...\n");

  const testEmail = "winner@example.com";
  const details = {
    userName: "Jane Smith",
    drawTitle: "Tesla Model Y Environmental Sweepstakes",
    prizeName: "Brand New Tesla Model Y (or cash equivalent)",
    matchTier: "5 Match (Grand Jackpot)",
    actionUrl: "http://localhost:3000/dashboard/draws"
  };

  const res = await sendWinnerAlertNotificationEmail(testEmail, details);
  console.log("\nEmail Dispatch Result:", res);
}

verify().catch(console.error);
