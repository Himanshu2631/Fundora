import { sendDrawResultNotificationEmail } from "../lib/email.js";

async function verify() {
  console.log("Testing sendDrawResultNotificationEmail...\n");

  const testEmail = "participant@example.com";
  const details = {
    userName: "John Doe",
    drawTitle: "Clean Water Reforestation June Mega Draw",
    drawDate: "June 30, 2026",
    ticketCount: 3,
    winningNumbers: [14, 25, 36, 48, 77],
    userTickets: [
      { ticket_number: "FND-JD-DR1A", numbers: [14, 25, 36, 50, 80], matchCount: 3 },
      { ticket_number: "FND-JD-DR1B", numbers: [1, 2, 3, 4, 5], matchCount: 0 },
      { ticket_number: "FND-JD-DR1C", numbers: [14, 25, 9, 10, 11], matchCount: 2 }
    ],
    actionUrl: "http://localhost:3000/dashboard/draws"
  };

  const res = await sendDrawResultNotificationEmail(testEmail, details);
  console.log("\nEmail Dispatch Result:", res);
}

verify().catch(console.error);
