import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { getEmailImportStatus } from "@/server/services/emailImportService";
import { getParsedEmailStats } from "@/lib/sheets";

export const GET = withSession("GET email status", async (session) => {
  const [status, stats] = await Promise.all([
    getEmailImportStatus(session),
    getParsedEmailStats(session.accessToken, session.sheetId),
  ]);

  return NextResponse.json({
    ...status,
    emailsScanned: stats.total,
    emailsParsed: stats.parsed,
    emailsSkipped: stats.skipped,
    emailsFailed: stats.failed,
  });
});
