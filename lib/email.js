import { Resend } from "resend";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || "Fundora <noreply@fundora.com>";

let resendInstance = null;
if (resendApiKey && resendApiKey !== "placeholder" && !resendApiKey.startsWith("re_your_api_key")) {
  resendInstance = new Resend(resendApiKey);
} else {
  console.warn(
    "⚠️ Resend: RESEND_API_KEY is missing or placeholder. Transactional email service running in Mock mode."
  );
}

/**
 * Reusable HTML template builder incorporating Fundora's premium dark forest-green branding.
 */
function getBaseEmailHtml({ title, bodyHtml, ctaText, ctaUrl }) {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${title}</title>
        <style>
          body {
            background-color: #040D09;
            color: #E2E8F0;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            margin: 0;
            padding: 0;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
          }
          .wrapper {
            background-color: #040D09;
            padding: 40px 20px;
          }
          .container {
            background-color: #0A1C16;
            border: 1px solid rgba(212, 185, 147, 0.15);
            border-radius: 16px;
            max-width: 580px;
            margin: 0 auto;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0,0,0,0.5);
          }
          .header {
            border-bottom: 1px solid rgba(255,255,255,0.06);
            padding: 24px;
            text-align: center;
          }
          .logo-badge {
            background-color: #C4A054;
            color: #060C0A;
            display: inline-block;
            font-weight: 900;
            font-size: 20px;
            width: 36px;
            height: 36px;
            line-height: 36px;
            border-radius: 8px;
            text-align: center;
          }
          .brand-name {
            color: #FFFFFF;
            font-size: 18px;
            font-weight: 800;
            letter-spacing: 0.15em;
            margin-left: 10px;
            vertical-align: middle;
          }
          .content {
            padding: 32px 24px;
          }
          .title {
            color: #C4A054;
            font-size: 22px;
            font-weight: 800;
            margin-top: 0;
            margin-bottom: 20px;
            text-align: center;
          }
          .text {
            color: #B2C0B9;
            font-size: 15px;
            line-height: 1.6;
            margin-bottom: 24px;
          }
          .cta-container {
            text-align: center;
            margin: 30px 0;
          }
          .cta-button {
            background-color: #C4A054;
            border: none;
            border-radius: 8px;
            color: #040D09 !important;
            display: inline-block;
            font-size: 13px;
            font-weight: 800;
            letter-spacing: 0.05em;
            padding: 14px 28px;
            text-decoration: none;
            text-transform: uppercase;
          }
          .footer {
            background-color: rgba(0,0,0,0.2);
            border-top: 1px solid rgba(255,255,255,0.04);
            color: #8A9690;
            font-size: 11px;
            line-height: 1.5;
            padding: 24px;
            text-align: center;
          }
          .footer a {
            color: #C4A054;
            text-decoration: none;
          }
        </style>
      </head>
      <body>
        <div class="wrapper">
          <div class="container">
            <div class="header">
              <span class="logo-badge">F</span>
              <span class="brand-name">FUNDORA</span>
            </div>
            <div class="content">
              <h2 class="title">${title}</h2>
              <div class="text">
                ${bodyHtml}
              </div>
              ${ctaText && ctaUrl ? `
                <div class="cta-container">
                  <a href="${ctaUrl}" class="cta-button">${ctaText}</a>
                </div>
              ` : ""}
            </div>
            <div class="footer">
              <p>Fundora operates as a provably fair giving & audited sweepstakes platform.</p>
              <p>This message was sent to you as part of your system transactional receipts.</p>
              <p>&copy; 2026 Fundora. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

/**
 * Sends a generic system update or notification email.
 */
export async function sendSystemUpdateEmail(to, { userName, updateTitle, updateDetails, actionUrl }) {
  const subject = `[Fundora] System Update: ${updateTitle}`;
  const bodyHtml = `
    <p>Hello ${userName || "Valued Philanthropist"},</p>
    <p>We want to share a recent update regarding the Fundora platform:</p>
    <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px; margin: 16px 0;">
      <strong style="color: #FFFFFF; display: block; margin-bottom: 8px;">${updateTitle}</strong>
      <span style="font-size: 13.5px; color: #B2C0B9;">${updateDetails}</span>
    </div>
    <p>If you have any questions or require validation of transaction logs, please visit your account dashboard.</p>
  `;

  const html = getBaseEmailHtml({
    title: "System Notification",
    bodyHtml,
    ctaText: actionUrl ? "View Dashboard" : null,
    ctaUrl: actionUrl,
  });

  return sendEmail({ to, subject, html });
}

/**
 * Sends a draw result summary email.
 */
export async function sendDrawResultEmail(
  to,
  { userName, drawName, ticketNumber, resultStatus, prizeTitle, actionUrl }
) {
  const subject = `[Fundora] Draw Results: ${drawName}`;
  const isWinner = resultStatus === "won";
  
  const bodyHtml = `
    <p>Hello ${userName || "Member"},</p>
    <p>The draw for <strong>${drawName}</strong> has been finalized and certified!</p>
    <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13.5px;">
      <p style="margin: 4px 0; color: #B2C0B9;"><strong>Ticket Registered:</strong> <code style="color: #C4A054; font-family: monospace;">${ticketNumber}</code></p>
      <p style="margin: 4px 0; color: #B2C0B9;"><strong>Status:</strong> ${
        isWinner
          ? '<span style="color: #10B981; font-weight: bold;">WINNER</span>'
          : "Not drawn"
      }</p>
      ${isWinner ? `<p style="margin: 4px 0; color: #FFFFFF;"><strong>Prize Awarded:</strong> ${prizeTitle}</p>` : ""}
    </div>
    <p>${
      isWinner
        ? "Congratulations on your win! Please click below to claim your prize."
        : "Thank you for your contribution. Your participation directly funded local environmental & education initiatives."
    }</p>
  `;

  const html = getBaseEmailHtml({
    title: isWinner ? "🏆 Draw Winning Entry" : "Draw Completed",
    bodyHtml,
    ctaText: isWinner ? "Claim My Prize" : "Explore Active Draws",
    ctaUrl: actionUrl || "https://fundora.com/dashboard/draws",
  });

  return sendEmail({ to, subject, html });
}

/**
 * Sends a high-priority winner notification alert.
 */
export async function sendWinnerAlertEmail(
  to,
  { userName, drawName, ticketNumber, prizeValue, claimDeadline, actionUrl }
) {
  const subject = `🚨 WINNER ALERT: You won the ${drawName} on Fundora!`;
  
  const bodyHtml = `
    <p>Hello ${userName || "Winner"},</p>
    <p style="font-size: 16px; color: #10B981; font-weight: bold; margin-bottom: 16px;">
      🎉 Congratulations! You have been drawn as a winner!
    </p>
    <p>Your ticket has been selected as the winning entry in the <strong>${drawName}</strong>.</p>
    <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(212, 185, 147, 0.2); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <span style="font-size: 12px; text-transform: uppercase; color: #8A9690; display: block; letter-spacing: 0.1em;">
        Prize Value
      </span>
      <strong style="font-size: 32px; color: #C4A054; display: block; margin: 8px 0; font-family: monospace;">
        ${prizeValue}
      </strong>
      <span style="font-size: 11px; color: #B2C0B9;">
        Winning Ticket ID: <code style="font-family: monospace;">${ticketNumber}</code>
      </span>
    </div>
    <p style="color: #EF4444; font-weight: bold; font-size: 14px;">
      ⚠️ IMPORTANT DEADLINE TO CLAIM: ${claimDeadline}
    </p>
    <p>To comply with compliance regulations, please complete your escrow payout details within the deadline period by clicking the button below.</p>
  `;

  const html = getBaseEmailHtml({
    title: "Official Winner Declaration",
    bodyHtml,
    ctaText: "Claim My Payout",
    ctaUrl: actionUrl || "https://fundora.com/dashboard/draws",
  });

  return sendEmail({ to, subject, html });
}

/**
 * Underlying helper function to dispatch emails via Resend or output mocks to logs.
 */
async function sendEmail({ to, subject, html }) {
  if (resendInstance) {
    try {
      const data = await resendInstance.emails.send({
        from: emailFrom,
        to,
        subject,
        html,
      });
      return { success: true, id: data.id, mode: "live" };
    } catch (error) {
      console.error("❌ Resend: Error sending email:", error);
      return { success: false, error: error.message, mode: "live" };
    }
  } else {
    // Elegant log styling for local development mock
    console.log("==========================================");
    console.log("📧 MOCK EMAIL DISPATCH");
    console.log(`From:    ${emailFrom}`);
    console.log(`To:      ${to}`);
    console.log(`Subject: ${subject}`);
    console.log("------------------------------------------");
    // Simple HTML to text extraction for log preview
    const cleanText = html
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 300);
    console.log(`Body (Preview): ${cleanText}...`);
    console.log("==========================================");

    return {
      success: true,
      id: `mock-email-${Math.random().toString(36).substring(2, 11)}`,
      mode: "mock",
    };
  }
}
