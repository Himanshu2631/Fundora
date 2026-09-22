import { GET as getAssessmentById } from "../../../assessments/[id]/route.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request, context) {
  return getAssessmentById(request, context);
}
