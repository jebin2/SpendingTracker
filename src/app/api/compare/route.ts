import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getComparisonStatus, requestComparison } from "@/server/services/comparisonService";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.access_token || !session.sheet_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const merchants = searchParams.get("merchants")?.split("|").filter(Boolean) ?? [];
  const period = searchParams.get("period") ?? "month";
  return NextResponse.json(
    await getComparisonStatus({ accessToken: session.access_token, sheetId: session.sheet_id }, merchants, period)
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.access_token || !session.sheet_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await requestComparison(
    { accessToken: session.access_token, sheetId: session.sheet_id },
    await req.json()
  );

  if ("error" in result) {
    return NextResponse.json({ error: "Select at least 2 merchants" }, { status: 400 });
  }

  return NextResponse.json(result);
}
