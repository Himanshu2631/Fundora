import { Resend } from "resend";
import { createServer } from "@/lib/supabase-server";

const resendApiKey = process.env.RESEND_API_KEY;
const emailFrom = process.env.EMAIL_FROM || "Sahayata <noreply@sahayata.com>";

const getDefaultAppUrl = () => {
  return process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
};

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
              <span class="logo-badge">S</span>
              <span class="brand-name">SAHAYATA</span>
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
              <p>Sahayata operates as a provably fair giving & audited sweepstakes platform.</p>
              <p>This message was sent to you as part of your system transactional receipts.</p>
              <p>&copy; 2026 Sahayata. All rights reserved.</p>
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

  const subject = `[Sahayata] System Update: ${updateTitle}`;
  const bodyHtml = `
    <p>Hello ${userName || "Valued Philanthropist"},</p>
    <p>We want to share a recent update regarding the Sahayata platform:</p>
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
