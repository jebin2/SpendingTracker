import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getAnalysisStatus, requestAnalysis } from "@/server/services/analysisService";

// GET — return current cache status/data (no generation)
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.access_token || !session.sheet_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const period = new URL(req.url).searchParams.get("period") ?? "month";
  return NextResponse.json(
    await getAnalysisStatus({ accessToken: session.access_token, sheetId: session.sheet_id }, period)
  );
}

// POST — kick off async generation
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.access_token || !session.sheet_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { period = "month", region, lifestyle_tags, force_refresh } = await req.json();
  return NextResponse.json(
    await requestAnalysis(
      { accessToken: session.access_token, sheetId: session.sheet_id },
      { period, region, lifestyle_tags, force_refresh }
    )
  );
}
