import { GET as getAssessmentSummary } from "../../../assessments/summary/route.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  return getAssessmentSummary(request);
}
