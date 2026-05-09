import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { apiError } from "@/lib/api-error";
import { processReceipt } from "@/server/services/receiptProcessingService";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.access_token || !session.sheet_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { txId, region } = await req.json();
  if (!txId) return NextResponse.json({ error: "txId required" }, { status: 400 });

  try {
    const result = await processReceipt(
      { accessToken: session.access_token, sheetId: session.sheet_id },
      { txId, region }
    );
    if ("error" in result) return NextResponse.json({ error: result.error }, { status: result.status });
    return NextResponse.json(result);
  } catch (err) {
    return apiError("Receipt processing error", err);
  }
}
