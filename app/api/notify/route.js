import { NextResponse } from "next/server";
import { sendSystemUpdateEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const body = await req.json().catch(() => ({}));
    const { eventType, email, userName, details } = body;

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const timestamp = new Date().toLocaleString("en-US", { timeZone: "UTC" }) + " UTC";

    let subject = "";
    let bodyHtml = "";

    switch (eventType) {
      case "registration":
        subject = "Welcome to Fundora!";
        bodyHtml = `
          <p>Hello ${userName || "Member"},</p>
          <p>We are thrilled to welcome you to <strong>Fundora</strong> — the provably fair giving & golf reward platform!</p>
          <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(212,185,147,0.15); border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #FFFFFF;"><strong>Account Status:</strong> Registered Successfully</p>
            <p style="margin: 0 0 8px 0; color: #B2C0B9;"><strong>Registered At:</strong> ${timestamp}</p>
            <p style="margin: 0; color: #B2C0B9;"><strong>Security Note:</strong> Account created via secure credentials.</p>
          </div>
          <p>Your giving journey starts now. Upgrade to a membership tier to start routing contributions to vetted causes, log your golf scores to boost entry multipliers, and stand a chance to win monthly rewards.</p>
        `;
        break;

      case "purchase":
        const planName = details?.planName || "Giving Plan";
        subject = "Subscription Activated";
        bodyHtml = `
          <p>Hello ${userName || "Member"},</p>
          <p>Thank you for starting your active giving journey on Fundora!</p>
          <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(212,185,147,0.15); border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #FFFFFF;"><strong>Membership Plan:</strong> ${planName}</p>
            <p style="margin: 0 0 8px 0; color: #B2C0B9;"><strong>Status:</strong> Active</p>
            <p style="margin: 0; color: #B2C0B9;"><strong>Activated At:</strong> ${timestamp}</p>
          </div>
          <p>Your monthly contributions are now active. Head over to your dashboard to configure which vetted local charities receive your allocations.</p>
        `;
        break;

      case "cancel":
        subject = "Subscription Cancelled";
        bodyHtml = `
          <p>Hello ${userName || "Member"},</p>
          <p>We are writing to confirm that your Fundora subscription has been cancelled.</p>
          <div style="background-color: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 16px; margin: 16px 0;">
            <p style="margin: 0 0 8px 0; color: #FFFFFF;"><strong>Status:</strong> Cancelled (Cessation Pending)</p>
            <p style="margin: 0; color: #B2C0B9;"><strong>Requested At:</strong> ${timestamp}</p>
          </div>
          <p>You will retain access to active tickets, score logging multipliers, and charity configurations until the end of your current billing cycle. Thank you for the impact you have made so far!</p>
        `;
        break;

      default:
        return NextResponse.json({ error: `Unsupported eventType: ${eventType}` }, { status: 400 });
    }

    const emailResult = await sendSystemUpdateEmail(email, {
      userName,
      updateTitle: subject,
      updateDetails: bodyHtml,
    });

    return NextResponse.json({ success: true, ...emailResult });
  } catch (error) {
    console.error("Error in notify route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
