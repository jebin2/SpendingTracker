import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { getPendingSuggestions, resolvePendingSuggestion } from "@/server/services/itemSuggestionService";

export const GET = withSession("GET suggestions", async (session) => {
  const suggestions = await getPendingSuggestions(session);
  return NextResponse.json({ suggestions });
});

export const PATCH = withSession("PATCH suggestion", async (session, req) => {
  await resolvePendingSuggestion(session, await req.json());
  return NextResponse.json({ ok: true });
});
