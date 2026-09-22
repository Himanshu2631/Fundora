import { NextResponse } from "next/server.js";
import { getCampaignViabilityAssessmentById } from "../../../../../lib/ml/adminAssessmentService.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/admin/assessments/[id] (or /api/admin/ml/assessments/[id])
 *
 * Secure server-side endpoint to retrieve a single campaign viability assessment by ID.
 * Enforces strict server-side administrator authorization and input validation.
 */
export async function GET(request, context) {
  try {
    const params = await (context?.params || {});
    const assessmentId = params?.id;

    if (!assessmentId || typeof assessmentId !== "string" || !assessmentId.trim()) {
      return NextResponse.json(
        { error: "Invalid assessment ID provided." },
        { status: 400 }
      );
    }

    const cookieStore = request?.cookies;
    const assessment = await getCampaignViabilityAssessmentById(assessmentId.trim(), { cookieStore });

    if (!assessment) {
      return NextResponse.json(
        { error: `Campaign viability assessment '${assessmentId}' was not found.` },
        { status: 404 }
      );
    }

    const response = NextResponse.json(
      {
        success: true,
        data: assessment,
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

    if (err.statusCode === 400 || err.code === "INVALID_ASSESSMENT_ID") {
      return NextResponse.json(
        { error: err.message || "Invalid assessment ID." },
        { status: 400 }
      );
    }

    console.error("[Admin Assessment Detail Route Error]:", err.message);
    return NextResponse.json(
      { error: "Internal server error occurred while retrieving assessment details." },
      { status: 500 }
    );
  }
}
