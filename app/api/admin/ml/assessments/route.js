import { GET as getAssessments } from "../../assessments/route.js";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request) {
  return getAssessments(request);
}
