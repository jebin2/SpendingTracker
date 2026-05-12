import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Sheet is already initialized during sign-in (auth.ts jwt callback).
// This endpoint just tells the client whether this is a new user.
export async function POST() {
  const session = await auth();
  if (!session?.access_token || !session.sheet_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sheetUrl = `https://docs.google.com/spreadsheets/d/${session.sheet_id}/edit`;
  return NextResponse.json({ sheetId: session.sheet_id, sheetUrl, isNew: false });
}
