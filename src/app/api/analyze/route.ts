import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { getAnalysisStatus, requestAnalysis } from "@/server/services/analysisService";

export const GET = withSession("GET analysis", async (session, req) => {
  const period = new URL(req.url).searchParams.get("period") ?? "month";
  return NextResponse.json(await getAnalysisStatus(session, period));
});

export const POST = withSession("POST analysis", async (session, req) => {
  const { period = "month", region, lifestyle_tags, force_refresh } = await req.json();
  return NextResponse.json(await requestAnalysis(session, { period, region, lifestyle_tags, force_refresh }));
});
