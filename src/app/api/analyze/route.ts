import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { getAnalysisStatus, requestAnalysis } from "@/server/services/analysisService";

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const period = new URL(req.url).searchParams.get("period") ?? "month";
  return NextResponse.json(await getAnalysisStatus(result.session, period));
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { period = "month", region, lifestyle_tags, force_refresh } = await req.json();
  return NextResponse.json(await requestAnalysis(result.session, { period, region, lifestyle_tags, force_refresh }));
}
