import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { parseTransactionText } from "@/lib/ai/parse-text";
import { todayISO } from "@/lib/date/iso";

export const POST = withSession("POST parse text", async (_session, req) => {
  const { text, region } = await req.json();
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });
  const extracted = await parseTransactionText(text, region, todayISO());
  return NextResponse.json({ extracted, confidence: extracted.confidence });
});
