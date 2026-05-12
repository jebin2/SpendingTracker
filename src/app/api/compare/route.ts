import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { getComparisonStatus, requestComparison } from "@/server/services/comparisonService";

export async function GET(req: NextRequest) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { searchParams } = new URL(req.url);
  const merchants = searchParams.get("merchants")?.split("|").filter(Boolean) ?? [];
  const period = searchParams.get("period") ?? "month";
  return NextResponse.json(await getComparisonStatus(result.session, merchants, period));
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const comparison = await requestComparison(result.session, await req.json());
  if ("error" in comparison) {
    return NextResponse.json({ error: "Select at least 2 merchants" }, { status: 400 });
  }
  return NextResponse.json(comparison);
}
