import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { requestEmailImport } from "@/server/services/emailImportService";

// maxDuration = 300s — email processing can take time for large mailboxes
export const maxDuration = 300;

// Called by:
//   1. Vercel Cron at midnight UTC  (vercel.json: "0 0 * * *")
//   2. Manual "Fetch now" button in settings (POST from client)
//
// Always fire-and-forget — responds immediately, job runs in background.
export const POST = withSession("POST email fetch", async (session) => {
  requestEmailImport(session);
  return NextResponse.json({ ok: true, message: "Email import started in background." });
});
