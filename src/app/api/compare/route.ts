import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { getComparisonStatus, requestComparison } from "@/server/services/comparisonService";

export const GET = withSession("GET comparison", async (session, req) => {
  const { searchParams } = new URL(req.url);
  const merchants = searchParams.get("merchants")?.split("|").filter(Boolean) ?? [];
  const period = searchParams.get("period") ?? "month";
  return NextResponse.json(await getComparisonStatus(session, merchants, period));
});

export const POST = withSession("POST comparison", async (session, req) => {
  const comparison = await requestComparison(session, await req.json());
  if ("error" in comparison) {
    return NextResponse.json({ error: "Select at least 2 merchants" }, { status: 400 });
  }
  return NextResponse.json(comparison);
});
