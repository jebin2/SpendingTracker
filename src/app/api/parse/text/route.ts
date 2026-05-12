import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { parseTransactionText } from "@/lib/ai/parse-text";
import { apiError } from "@/lib/api-error";
import { todayISO } from "@/lib/date/iso";

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { text, region } = await req.json();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
  try {
    const extracted = await parseTransactionText(text, region, todayISO());
    return NextResponse.json({ extracted, confidence: extracted.confidence });
  } catch (err) {
    return apiError("Parse text error", err);
  }
}
