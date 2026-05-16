import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { requestEmailImport } from "@/server/services/emailImportService";

// maxDuration = 300s — email processing can take time for large mailboxes
export const maxDuration = 300;

// Called by:
//   1. useSyncEffect (daily auto-trigger — fires when last_run > 23h, uses browser session)
//   2. Manual "Fetch now" button in settings (?manual=1)
//
// Always fire-and-forget — responds immediately, job runs in background.
export const POST = withSession("POST email fetch", async (session, req) => {
  const manual = new URL(req.url).searchParams.get("manual") === "1";
  requestEmailImport(session, { manual });
  return NextResponse.json({ ok: true, message: "Email import started in background." });
});
