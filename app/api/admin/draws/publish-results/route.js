import { NextResponse } from "next/server";
import { createServer } from "@/lib/supabase-server";
import { sendDrawResultNotificationEmail } from "@/lib/email";
import { calculateMatches } from "@/lib/drawUtilities";

export const dynamic = "force-dynamic";

export async function POST(req) {
  try {
    const { drawId } = await req.json().catch(() => ({}));
    if (!drawId) {
      return NextResponse.json({ error: "drawId is required" }, { status: 400 });
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

    // 2. Fetch draw details
    const { data: draw, error: drawError } = await supabase
      .from("draws")
      .select("*")
      .eq("id", drawId)
      .single();

    if (drawError || !draw) {
      return NextResponse.json({ error: "Draw not found" }, { status: 404 });
    }

    if (draw.status !== "completed") {
      return NextResponse.json({ error: "Draw results are not completed yet" }, { status: 400 });
    }

    // 3. Fetch all entries for this draw
    const { data: entries, error: entriesError } = await supabase
      .from("draw_entries")
      .select("*")
      .eq("draw_id", drawId);

    if (entriesError) {
      console.error("Error fetching entries for draw:", entriesError);
      return NextResponse.json({ error: "Failed to fetch draw entries" }, { status: 500 });
    }

    if (!entries || entries.length === 0) {
      return NextResponse.json({ success: true, notifiedCount: 0, message: "No entries for this draw" });
    }

    // Group entries by user_id
    const userEntriesMap = {};
    entries.forEach(entry => {
      if (!userEntriesMap[entry.user_id]) {
        userEntriesMap[entry.user_id] = [];
      }
      userEntriesMap[entry.user_id].push(entry);
    });

    const participantIds = Object.keys(userEntriesMap);

    // Fetch profiles of all participants
    const { data: participantProfiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, email, full_name")
      .in("id", participantIds);

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      return NextResponse.json({ error: "Failed to fetch participant profiles" }, { status: 500 });
    }

    const profilesMap = {};
    participantProfiles.forEach(p => {
      profilesMap[p.id] = p;
    });

    const winningNumbers = draw.generated_numbers || [];
    const drawDateFormatted = new Date(draw.draw_date).toLocaleDateString("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric"
    });

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const actionUrl = `${appUrl}/dashboard/draws`;

    let notifiedCount = 0;

    // Send notification to each participant
    for (const userId of participantIds) {
      const pProfile = profilesMap[userId];
      const userEmail = pProfile?.email;
      if (!userEmail) continue;

      const userTickets = userEntriesMap[userId].map(entry => {
        const entryNumbers = entry.numbers || [];
        const matchCount = calculateMatches(entryNumbers, winningNumbers);
        return {
          ticket_number: entry.ticket_number,
          numbers: entryNumbers,
          matchCount
        };
      });

      const ticketCount = userTickets.length;
      const userName = pProfile.full_name || userEmail.split("@")[0];

      await sendDrawResultNotificationEmail(userEmail, {
        userName,
        drawTitle: draw.title,
        drawDate: drawDateFormatted,
        ticketCount,
        winningNumbers,
        userTickets,
        actionUrl
      });

      notifiedCount++;
    }

    return NextResponse.json({
      success: true,
      notifiedCount,
      message: `Draw result notifications successfully sent to ${notifiedCount} participants.`
    });
  } catch (error) {
    console.error("Error in publish-results route:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}
