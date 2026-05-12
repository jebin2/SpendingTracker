import { NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { resetSheet } from "@/lib/sheets";
import { apiError } from "@/lib/api-error";

export async function POST() {
  const result = await requireSession();
  if (!result.ok) return result.response;
  try {
    await resetSheet(result.session.accessToken, result.session.sheetId);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError("Reset error", err);
  }
}
