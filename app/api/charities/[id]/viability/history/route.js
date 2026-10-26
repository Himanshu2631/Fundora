import { NextResponse } from "next/server.js";
import { getCampaignViabilityAssessmentHistory } from "../../../../../../lib/ml/assessmentService.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/charities/[id]/viability/history
 *
 * Dedicated alias endpoint to retrieve full chronological assessment history for a charity campaign.
 */
export async function GET(request, context) {
  try {
    const params = await (context?.params || {});
    const charityId = params?.id;

    if (!charityId || typeof charityId !== "string" || !charityId.trim()) {
      return NextResponse.json(
        { error: "Valid charity/campaign ID is required." },
        { status: 400 }
      );
    }

    const cleanCharityId = charityId.trim();
    let url;
    try {
      url = new URL(request?.url || "http://localhost");
    } catch {
      url = { searchParams: new Map() };
    }
    const searchParams = url.searchParams || new Map();
    const sortOrderParam = searchParams.get("sortOrder") || searchParams.get("sort_order") || "desc";
    const sortOrder = sortOrderParam.toLowerCase() === "asc" ? "asc" : "desc";
    const rawLimit = searchParams.get("limit");
    const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;

    const cookieStore = request?.cookies;
    const history = await getCampaignViabilityAssessmentHistory(cleanCharityId, {
      cookieStore,
      supabaseClient: request?.supabaseClient,
      sortOrder,
      limit,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: history,
        history,
      },
      { status: 200 }
    );

    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return response;
  } catch (err) {
    console.error("[Charity Viability History Route Error]:", err.message);
    return NextResponse.json(
      { error: "Unable to retrieve charity viability assessment history." },
      { status: 500 }
    );
  }
}
