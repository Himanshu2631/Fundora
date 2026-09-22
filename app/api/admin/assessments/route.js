import { NextResponse } from "next/server.js";
import { getCampaignViabilityAssessments } from "../../../../lib/ml/adminAssessmentService.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const ALLOWED_RISK_LEVELS = new Set(["LOW RISK", "MEDIUM RISK", "HIGH RISK"]);
const ALLOWED_ASSESSMENT_TYPES = new Set(["initial_48h", "reassessment", "manual"]);
const ALLOWED_SORT_ORDERS = new Set(["asc", "desc"]);

/**
 * GET /api/admin/assessments (or /api/admin/ml/assessments)
 *
 * Secure server-side endpoint to list campaign viability assessments for the Admin Dashboard.
 * Enforces strict server-side administrator authorization and input validation.
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);

    // 1. Validate & parse pagination parameters
    const rawPage = searchParams.get("page");
    let page = 1;
    if (rawPage !== null && rawPage !== "") {
      const parsedPage = Number(rawPage);
      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        return NextResponse.json(
          { error: "Query parameter 'page' must be a positive integer." },
          { status: 400 }
        );
      }
      page = parsedPage;
    }

    const rawPageSize = searchParams.get("pageSize") || searchParams.get("limit");
    let pageSize = 10;
    if (rawPageSize !== null && rawPageSize !== "") {
      const parsedPageSize = Number(rawPageSize);
      if (!Number.isInteger(parsedPageSize) || parsedPageSize < 1 || parsedPageSize > 100) {
        return NextResponse.json(
          { error: "Query parameter 'pageSize' must be an integer between 1 and 100." },
          { status: 400 }
        );
      }
      pageSize = parsedPageSize;
    }

    // 2. Validate & parse filter parameters
    const riskLevelParam = searchParams.get("riskLevel") || searchParams.get("risk_level");
    let riskLevel;
    if (riskLevelParam) {
      const normalizedRisk = riskLevelParam.trim().toUpperCase();
      if (!ALLOWED_RISK_LEVELS.has(normalizedRisk)) {
        return NextResponse.json(
          { error: `Invalid riskLevel '${riskLevelParam}'. Allowed values: LOW RISK, MEDIUM RISK, HIGH RISK.` },
          { status: 400 }
        );
      }
      riskLevel = normalizedRisk;
    }

    const assessmentTypeParam = searchParams.get("assessmentType") || searchParams.get("assessment_type");
    let assessmentType;
    if (assessmentTypeParam) {
      const normalizedType = assessmentTypeParam.trim().toLowerCase();
      if (!ALLOWED_ASSESSMENT_TYPES.has(normalizedType)) {
        return NextResponse.json(
          { error: `Invalid assessmentType '${assessmentTypeParam}'. Allowed values: initial_48h, reassessment, manual.` },
          { status: 400 }
        );
      }
      assessmentType = normalizedType;
    }

    const campaignIdParam = searchParams.get("campaignId") || searchParams.get("campaign_id");
    const campaignId = campaignIdParam ? campaignIdParam.trim() : undefined;

    // 3. Validate & parse sort parameters
    const sortOrderParam = searchParams.get("sortOrder") || searchParams.get("sort_order") || searchParams.get("order");
    let sortOrder = "desc";
    if (sortOrderParam) {
      const normalizedOrder = sortOrderParam.trim().toLowerCase();
      if (!ALLOWED_SORT_ORDERS.has(normalizedOrder)) {
        return NextResponse.json(
          { error: `Invalid sortOrder '${sortOrderParam}'. Allowed values: asc, desc.` },
          { status: 400 }
        );
      }
      sortOrder = normalizedOrder;
    }

    // 4. Extract cookie store from request if present
    const cookieStore = request?.cookies;

    // 5. Query assessment data layer (handles server-side admin authentication)
    const { assessments, pagination } = await getCampaignViabilityAssessments({
      page,
      pageSize,
      riskLevel,
      campaignId,
      assessmentType,
      sortOrder,
      cookieStore,
    });

    const response = NextResponse.json(
      {
        success: true,
        data: assessments,
        pagination,
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

    console.error("[Admin Assessment List Route Error]:", err.message);
    return NextResponse.json(
      { error: "Internal server error occurred while retrieving assessments." },
      { status: 500 }
    );
  }
}
