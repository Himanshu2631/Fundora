import { NextResponse } from "next/server";
import {
  verifyCronAuthorization,
  runScheduledViabilityAssessments,
} from "@/lib/ml/assessmentScheduler";

export const dynamic = "force-dynamic";

/**
 * Shared handler for scheduled viability assessment invocations.
 *
 * @param {Request} request
 * @returns {Promise<NextResponse>}
 */
async function handleScheduledAssessment(request) {
  // 1. Authenticate trigger
  const auth = verifyCronAuthorization(request);
  if (!auth.authorized) {
    return NextResponse.json(
      { error: "Unauthorized: Invalid or missing cron authorization token." },
      { status: 401 }
    );
  }

  try {
    // 2. Execute candidate discovery and assessment loop
    const summary = await runScheduledViabilityAssessments();

    const statusCode = summary.success ? 200 : 500;
    return NextResponse.json(summary, { status: statusCode });
  } catch (error) {
    console.error("[CRON Viability Assessment Error]:", error);
    return NextResponse.json(
      {
        error: "Internal server error during scheduled assessment execution.",
      },
      { status: 500 }
    );
  }
}

/**
 * GET handler - Standard trigger method for Vercel Cron.
 */
export async function GET(request) {
  return handleScheduledAssessment(request);
}

/**
 * POST handler - For automated webhooks or controlled manual triggers.
 */
export async function POST(request) {
  return handleScheduledAssessment(request);
}
