import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { resetSheet } from "@/lib/sheets";

export const POST = withSession("POST reset", async (session) => {
  await resetSheet(session.accessToken, session.sheetId);
  return NextResponse.json({ ok: true });
});
