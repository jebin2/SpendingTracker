import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";

// Sheet is already initialized during sign-in (auth.ts jwt callback).
// This endpoint just tells the client whether this is a new user.
export const POST = withSession("POST sheet init", async (session) => {
  const sheetUrl = `https://docs.google.com/spreadsheets/d/${session.sheetId}/edit`;
  return NextResponse.json({ sheetId: session.sheetId, sheetUrl, isNew: false });
});
