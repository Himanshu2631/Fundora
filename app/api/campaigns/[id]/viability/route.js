import { NextResponse } from "next/server.js";
import {
  getCampaignViabilityAssessment,
  getCampaignViabilityAssessmentHistory,
} from "../../../../../lib/ml/assessmentService.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/campaigns/[id]/viability
 *
 * Secure public/user-facing endpoint to retrieve a campaign's viability assessment.
 * Supports:
 * - Default: Returns latest viability assessment ({ success: true, data: assessment })
 * - ?history=true: Returns latest assessment and full chronological history ({ success: true, data: assessment, history: [...] })
 * - ?mode=history: Returns chronological assessment history
 *
 * Query parameters:
 * - history (boolean): If 'true', includes full chronological assessment history
 * - sortOrder ('desc'|'asc'): Direction of historical ordering (default 'desc')
 * - limit (integer): Max historical records to retrieve (default 50, max 100)
 */
export async function GET(request, context) {
  try {
    const params = await (context?.params || {});
    const campaignId = params?.id;

    if (!campaignId || typeof campaignId !== "string" || !campaignId.trim()) {
      return NextResponse.json(
        { error: "Valid campaign ID is required." },
        { status: 400 }
      );
    }

    const cleanCampaignId = campaignId.trim();
    let url;
    try {
      url = new URL(request?.url || "http://localhost");
    } catch {
      url = { searchParams: new Map() };
    }
    const searchParams = url.searchParams || new Map();
    const includeHistory = searchParams.get("history") === "true" || searchParams.get("include_history") === "true";
    const historyOnly = searchParams.get("mode") === "history" || searchParams.get("history_only") === "true";
    const sortOrderParam = searchParams.get("sortOrder") || searchParams.get("sort_order") || "desc";
    const sortOrder = sortOrderParam.toLowerCase() === "asc" ? "asc" : "desc";
    const rawLimit = searchParams.get("limit");
    const limit = rawLimit ? parseInt(rawLimit, 10) : undefined;

    const cookieStore = request?.cookies;
    const supabaseClient = request?.supabaseClient;

    if (historyOnly) {
      const history = await getCampaignViabilityAssessmentHistory(cleanCampaignId, {
        cookieStore,
        supabaseClient,
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
    }

    const assessment = await getCampaignViabilityAssessment(cleanCampaignId, { cookieStore, supabaseClient });

    let history;
    if (includeHistory) {
      history = await getCampaignViabilityAssessmentHistory(cleanCampaignId, {
        cookieStore,
        supabaseClient,
        sortOrder,
        limit,
      });
    }

    const payload = {
      success: true,
      data: assessment,
    };
    if (includeHistory) {
      payload.history = history || [];
    }

    const response = NextResponse.json(payload, { status: 200 });
    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return response;
  } catch (err) {
    console.error("[User Viability API Route Error]:", err.message);
    return NextResponse.json(
      { error: "Unable to retrieve campaign viability assessment." },
      { status: 500 }
    );
  }
}

