import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { requestDuplicateDetection } from "@/server/services/duplicateDetectionService";

export async function POST() {
  const session = await auth();
  if (!session?.access_token || !session.sheet_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await requestDuplicateDetection({
    accessToken: session.access_token,
    sheetId: session.sheet_id,
  });

  if ("error" in result) {
    return NextResponse.json(result, { status: 500 });
  }

  return NextResponse.json(result);
}
