import { NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { requestItemNormalization } from "@/server/services/itemNormalizationService";

export async function POST() {
  const result = await requireSession();
  if (!result.ok) return result.response;
  return NextResponse.json(await requestItemNormalization(result.session));
}
