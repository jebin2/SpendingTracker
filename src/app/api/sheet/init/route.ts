import { NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";

// Sheet is already initialized during sign-in (auth.ts jwt callback).
// This endpoint just tells the client whether this is a new user.
export async function POST() {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { sheetId } = result.session;
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/edit`;
  return NextResponse.json({ sheetId, sheetUrl, isNew: false });
}
