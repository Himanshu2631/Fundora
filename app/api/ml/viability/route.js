import { NextResponse } from "next/server";
import { predictCampaignViability } from "@/lib/ml/fastapi";

export const dynamic = "force-dynamic";

export async function POST(request) {
  try {
    let payload;
    try {
      payload = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON request body" },
        { status: 400 }
      );
    }

    const prediction = await predictCampaignViability(payload);

    return NextResponse.json(prediction, { status: 200 });
  } catch (error) {
    console.error("[ML Viability Bridge Error]:", error);

    return NextResponse.json(
      { error: "Unable to obtain campaign viability prediction" },
      { status: 502 }
    );
  }
}
