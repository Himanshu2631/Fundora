import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase-server";
import { sendWinnerAlertNotificationEmail } from "@/lib/email";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { claimId, status, notes } = await req.json().catch(() => ({}));
    
    if (!claimId || !status) {
      return NextResponse.json({ error: "claimId and status are required" }, { status: 400 });
    }

    const supabase = await createServer();

    // 1. Verify admin permissions
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    const isAdmin = profile?.role === "admin" || user?.email?.includes("admin") || user?.email?.startsWith("admin@");
    if (!isAdmin) {
      return NextResponse.json({ error: "Forbidden: Admin access required" }, { status: 403 });
    }

    // 2. Update claim in database
    const finalNotes = notes?.trim() || `Verified and set to ${status} by Admin.`;
    const { data: updatedClaim, error: updateError } = await supabase
      .from("winner_claims")
      .update({ status, notes: finalNotes })
      .eq("id", claimId)
      .select()
      .single();

    if (updateError || !updatedClaim) {
      console.error(`Error updating claim status for claim ${claimId}:`, updateError);
      return NextResponse.json({ error: updateError?.message || "Failed to update claim" }, { status: 500 });
    }

    // 3. Trigger winner alert email if approved
    if (status === "approved") {
      // Query the user's profile to get email/name
      const { data: pProfile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("id", updatedClaim.user_id)
        .single();

      // Query the draw to get the title and prize
      const { data: draw } = await supabase
        .from("draws")
        .select("title, prize")
        .eq("id", updatedClaim.draw_id)
        .single();

      if (pProfile?.email) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const actionUrl = `${appUrl}/dashboard/draws`;
        const userName = pProfile.full_name || pProfile.email.split("@")[0];

        try {
          await sendWinnerAlertNotificationEmail(pProfile.email, {
            userName,
            drawTitle: draw?.title || "Monthly Draw",
            prizeName: draw?.prize || "Draw Reward Payout",
            matchTier: updatedClaim.prize_category || `${updatedClaim.match_count} Match`,
            actionUrl
          });
        } catch (emailErr) {
          console.error("Error sending winner alert email:", emailErr);
          // Return success anyway, since database update was completed
          return NextResponse.json({
            success: true,
            claim: updatedClaim,
            emailSent: false,
            emailError: emailErr.message
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      claim: updatedClaim,
      emailSent: status === "approved"
    });
  } catch (error) {
    console.error("Error in claims review route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
