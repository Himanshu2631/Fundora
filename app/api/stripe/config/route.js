import { NextResponse } from "next/server";
import { isStripeMock } from "@/lib/stripe";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ isMock: isStripeMock });
  } catch (error) {
    console.error("Error in /api/stripe/config:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
