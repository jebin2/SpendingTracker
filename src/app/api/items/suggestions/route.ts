import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { getPendingSuggestions, resolvePendingSuggestion } from "@/server/services/itemSuggestionService";

export async function GET() {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const suggestions = await getPendingSuggestions(result.session);
  return NextResponse.json({ suggestions });
}

export async function PATCH(req: NextRequest) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  await resolvePendingSuggestion(result.session, await req.json());
  return NextResponse.json({ ok: true });
}
