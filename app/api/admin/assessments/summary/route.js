import { NextResponse } from "next/server.js";
import { getCampaignViabilitySummary } from "../../../../../lib/ml/adminAssessmentService.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/assessments/summary (or /api/admin/ml/assessments/summary)
 *
 * Secure server-side endpoint returning aggregate campaign viability summary statistics
 * for the Sahayata Admin Dashboard.
 */
export async function GET(request) {
  try {
    const cookieStore = request?.cookies;
    const summary = await getCampaignViabilitySummary({ cookieStore });

    const response = NextResponse.json(
      {
        success: true,
        data: summary,
      },
      { status: 200 }
    );

    response.headers.set("Cache-Control", "no-store, max-age=0, must-revalidate");
    return response;
  } catch (err) {
    if (err.statusCode === 401 || err.code === "UNAUTHORIZED") {
      return NextResponse.json(
        { error: "Unauthorized: Authentication required." },
        { status: 401 }
      );
    }

    if (err.statusCode === 403 || err.code === "FORBIDDEN") {
      return NextResponse.json(
        { error: "Forbidden: Administrator privileges required." },
        { status: 403 }
      );
    }

    console.error("[Admin Assessment Summary Route Error]:", err.message);
    return NextResponse.json(
      { error: "Internal server error occurred while retrieving viability summary." },
      { status: 500 }
    );
  }
}
