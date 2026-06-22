import { Resend } from "resend";
import { createServer } from "@/lib/supabase-server";

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
 * Check user notification preferences before sending email.
 */
async function checkEmailPreference(email, preferenceKey) {
  try {
    const supabase = await createServer();
    const { data, error } = await supabase
      .from("profiles")
      .select(preferenceKey)
      .eq("email", email)
      .maybeSingle();

    if (error) {
      console.error(`[email] Error checking preference for ${email}:`, error);
      return true; // default to sending on database errors
    }

    if (data && data[preferenceKey] === false) {
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Exception checking preference for ${email}:`, err);
    return true; // default to sending
  }
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
  const shouldSend = await checkEmailPreference(to, "pref_system_updates");
  if (!shouldSend) {
    console.log(`✉️ Skipped sendSystemUpdateEmail to ${to} (Opted out of pref_system_updates)`);
    return { success: true, id: "opted-out", mode: "skipped" };
  }

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
  const shouldSend = await checkEmailPreference(to, "pref_draw_results");
  if (!shouldSend) {
    console.log(`✉️ Skipped sendDrawResultEmail to ${to} (Opted out of pref_draw_results)`);
    return { success: true, id: "opted-out", mode: "skipped" };
  }

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
  const shouldSend = await checkEmailPreference(to, "pref_winner_alerts");
  if (!shouldSend) {
    console.log(`✉️ Skipped sendWinnerAlertEmail to ${to} (Opted out of pref_winner_alerts)`);
    return { success: true, id: "opted-out", mode: "skipped" };
  }

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
 * Sends a draw result notification email to a participant.
 */
export async function sendDrawResultNotificationEmail(
  to,
  { userName, drawTitle, drawDate, ticketCount, winningNumbers, userTickets, actionUrl }
) {
  const shouldSend = await checkEmailPreference(to, "pref_draw_results");
  if (!shouldSend) {
    console.log(`✉️ Skipped sendDrawResultNotificationEmail to ${to} (Opted out of pref_draw_results)`);
    return { success: true, id: "opted-out", mode: "skipped" };
  }

  const subject = "Monthly Draw Results Are Live";
  
  let ticketsHtml = "";
  let overallStatus = "No winning matches";
  let hasWin = false;
  
  if (userTickets && userTickets.length > 0) {
    ticketsHtml = `
      <div style="margin-top: 16px;">
        <span style="font-size: 11px; text-transform: uppercase; color: #8A9690; display: block; font-weight: bold; margin-bottom: 8px;">Your Registered Tickets</span>
    `;
    
    userTickets.forEach((ticket, idx) => {
      const ticketNums = ticket.numbers || [];
      const matchCount = ticket.matchCount || 0;
      const isWinner = matchCount >= 3;
      if (isWinner) {
        hasWin = true;
        overallStatus = `Winner! Ticket ${ticket.ticket_number} matched ${matchCount} numbers.`;
      }
      
      const badgeColor = isWinner ? "#10B981" : "#8A9690";
      const badgeBg = isWinner ? "rgba(16, 185, 129, 0.15)" : "rgba(255,255,255,0.05)";
      
      ticketsHtml += `
        <div style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.05); border-radius: 8px; padding: 12px; margin-bottom: 8px;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span style="font-family: monospace; font-size: 13px; color: #C4A054; font-weight: bold;">${ticket.ticket_number}</span>
            <span style="font-size: 11px; font-weight: bold; color: ${badgeColor}; background-color: ${badgeBg}; padding: 4px 8px; border-radius: 6px; border: 1px solid ${isWinner ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255,255,255,0.08)'};">
              ${isWinner ? `${matchCount} Matches (Win)` : `${matchCount} Matches`}
            </span>
          </div>
          <div style="margin-top: 8px; display: flex; gap: 4px; flex-wrap: wrap;">
            ${ticketNums.map(n => {
              const isMatch = (winningNumbers || []).includes(n);
              return `<span style="font-family: monospace; font-size: 10px; font-weight: bold; padding: 2px 6px; border-radius: 4px; border: 1px solid ${isMatch ? '#C4A054' : 'rgba(255,255,255,0.1)'}; background-color: ${isMatch ? 'rgba(196,160,84,0.15)' : 'transparent'}; color: ${isMatch ? '#C4A054' : '#B2C0B9'}; margin-right: 4px; display: inline-block;">${n}</span>`;
            }).join("")}
          </div>
        </div>
      `;
    });
    
    ticketsHtml += `</div>`;
  } else {
    ticketsHtml = `<p style="font-size: 13px; color: #8A9690; font-style: italic;">No tickets registered for this draw.</p>`;
  }

  const statusBg = hasWin ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)";
  const statusBorder = hasWin ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.06)";
  const statusText = hasWin ? "#10B981" : "#B2C0B9";

  const bodyHtml = `
    <p>Hello ${userName || "Member"},</p>
    <p>The monthly draw results for <strong>${drawTitle}</strong> are officially live and verified!</p>
    
    <div style="background-color: #081612; border: 1px solid rgba(212, 185, 147, 0.15); border-radius: 12px; padding: 20px; margin: 20px 0;">
      <table style="width: 100%; border-collapse: collapse; font-size: 13.5px;">
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
          <td style="padding: 10px 0; color: #8A9690; font-weight: 600;">Draw Date:</td>
          <td style="padding: 10px 0; color: #FFFFFF; font-weight: bold; text-align: right;">${drawDate}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
          <td style="padding: 10px 0; color: #8A9690; font-weight: 600;">Your Registered Tickets:</td>
          <td style="padding: 10px 0; color: #FFFFFF; font-weight: bold; text-align: right;">${ticketCount}</td>
        </tr>
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.06);">
          <td style="padding: 10px 0; color: #8A9690; font-weight: 600;">Winning Numbers:</td>
          <td style="padding: 10px 0; color: #C4A054; font-weight: bold; text-align: right;">
            <span style="font-family: monospace; font-size: 15px;">
              ${(winningNumbers || []).join(" - ")}
            </span>
          </td>
        </tr>
        <tr>
          <td style="padding: 10px 0; color: #8A9690; font-weight: 600;">Your Participation Status:</td>
          <td style="padding: 10px 0; text-align: right;">
            <span style="background-color: ${statusBg}; border: 1px solid ${statusBorder}; color: ${statusText}; font-weight: bold; padding: 4px 10px; border-radius: 6px; font-size: 12px; display: inline-block;">
              ${hasWin ? "🎉 WINNER" : "No Win"}
            </span>
          </td>
        </tr>
      </table>
      
      <div style="background-color: ${statusBg}; border: 1px solid ${statusBorder}; border-radius: 8px; padding: 12px; margin-top: 16px; font-size: 12.5px; color: ${statusText};">
        <strong>Participation Status Details:</strong><br/>
        ${overallStatus}
      </div>
      
      ${ticketsHtml}
    </div>
    
    <p>
      ${hasWin 
        ? "Congratulations on your win! Please visit your dashboard to claim your prize and verify the payout." 
        : "While you did not win a prize this month, your monthly giving plan contribution directly supported vetted global causes. We are incredibly grateful for your commitment to creating verified impact."
      }
    </p>
  `;

  const html = getBaseEmailHtml({
    title: "Monthly Draw Results Are Live",
    bodyHtml,
    ctaText: "View Results",
    ctaUrl: actionUrl || "https://fundora.com/dashboard/draws",
  });

  return sendEmail({ to, subject, html });
}

/**
 * Sends a winner notification alert email.
 */
export async function sendWinnerAlertNotificationEmail(
  to,
  { userName, drawTitle, prizeName, matchTier, actionUrl }
) {
  const shouldSend = await checkEmailPreference(to, "pref_winner_alerts");
  if (!shouldSend) {
    console.log(`✉️ Skipped sendWinnerAlertNotificationEmail to ${to} (Opted out of pref_winner_alerts)`);
    return { success: true, id: "opted-out", mode: "skipped" };
  }

  const subject = "Congratulations! You Won a Fundora Reward Draw";
  
  const bodyHtml = `
    <p>Hello ${userName || "Winner"},</p>
    <p style="font-size: 16px; color: #10B981; font-weight: bold; margin-bottom: 16px;">
      🎉 Congratulations! Your claim has been verified and approved by our audits!
    </p>
    <p>We are thrilled to confirm that your registered ticket is an official winner in the <strong>${drawTitle}</strong>.</p>
    
    <div style="background-color: #081612; border: 1px solid rgba(212, 185, 147, 0.2); border-radius: 12px; padding: 20px; margin: 20px 0; text-align: center;">
      <span style="font-size: 11px; text-transform: uppercase; color: #8A9690; display: block; letter-spacing: 0.1em;">
        Prize Won
      </span>
      <strong style="font-size: 26px; color: #C4A054; display: block; margin: 8px 0; font-family: monospace;">
        ${prizeName}
      </strong>
      <span style="font-size: 11.5px; color: #B2C0B9; display: block; margin-top: 4px;">
        Match Level: <strong>${matchTier}</strong>
      </span>
    </div>

    <div style="background-color: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px; margin: 16px 0; font-size: 13px; line-height: 1.6; color: #B2C0B9;">
      <strong style="color: #FFFFFF; display: block; margin-bottom: 8px;">📋 Claim Instructions & Verification Requirements</strong>
      <ul style="margin: 0; padding-left: 20px; text-align: left;">
        <li style="margin-bottom: 6px;">Click the <strong>Claim Prize</strong> button below to go directly to your claims dashboard.</li>
        <li style="margin-bottom: 6px;">Submit valid identification (KYC compliance check) matching your profile records.</li>
        <li style="margin-bottom: 6px;">Provide your bank transfer details or Stripe account for manual payout disbursement.</li>
        <li style="margin-bottom: 0;">Our compliance team will audit the documents and disburse the funds within 2-3 business days.</li>
      </ul>
    </div>
    
    <p>Thank you for being an active member of Fundora. Your continued support drives real, audited giving impact worldwide.</p>
  `;

  const html = getBaseEmailHtml({
    title: "Official Winner Declaration",
    bodyHtml,
    ctaText: "Claim Prize",
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
