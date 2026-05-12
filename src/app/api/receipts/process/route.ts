import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { apiError } from "@/lib/api-error";
import { processReceipt } from "@/server/services/receiptProcessingService";

export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { txId, region } = await req.json();
  if (!txId) return NextResponse.json({ error: "txId required" }, { status: 400 });
  try {
    const receipt = await processReceipt(result.session, { txId, region });
    if ("error" in receipt) return NextResponse.json({ error: receipt.error }, { status: receipt.status });
    return NextResponse.json(receipt);
  } catch (err) {
    return apiError("Receipt processing error", err);
  }
}
