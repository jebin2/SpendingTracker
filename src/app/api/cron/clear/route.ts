import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { setMetaValue } from "@/lib/sheets";

// POST /api/cron/clear — clears stuck dedup_running_at left by a server restart.
export const POST = withSession("POST cron/clear", async (session) => {
  await setMetaValue(session.accessToken, session.sheetId, "dedup_running_at", "");
  return NextResponse.json({ ok: true });
});
