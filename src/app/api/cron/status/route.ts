import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { getMetaValues, getAnalysisCacheForPeriods } from "@/lib/sheets";
import { cronSessionExists } from "@/lib/cron/cronStore";

export const GET = withSession("GET cron/status", async (session) => {
  const [meta, analysisByPeriod] = await Promise.all([
    getMetaValues(session.accessToken, session.sheetId),
    getAnalysisCacheForPeriods(session.accessToken, session.sheetId, ["week", "month", "year"]),
  ]);

  const dedupRunningAt  = meta.dedup_running_at      || null;
  const dedupLastRun    = meta.last_dedup_checked_at || null;
  // Treat dedup as "still running" only if:
  //  1. dedup_running_at is set AND within the last 10 minutes (guards against server-restart leaks)
  //  2. AND last_dedup_checked_at is NOT more recent than dedup_running_at
  //     (if last_dedup_checked_at > dedup_running_at the job already completed)
  const dedupStillRunning = dedupRunningAt
    ? Date.now() - new Date(dedupRunningAt).getTime() < 10 * 60 * 1000
      && !(dedupLastRun && new Date(dedupLastRun) > new Date(dedupRunningAt))
    : false;

  return NextResponse.json({
    registered: cronSessionExists(),
    email: {
      lastRun:   meta.email_import_last_run   ?? null,
      runningAt: meta.email_import_running_at ?? null,
      txCount:   parseInt(meta.email_import_tx_count ?? "0") || 0,
      enabled:   (meta.email_import_from_contains ? JSON.parse(meta.email_import_from_contains) : []).length > 0,
    },
    dedup: {
      lastRun:   meta.last_dedup_checked_at ?? null,
      runningAt: dedupStillRunning ? dedupRunningAt : null,
    },
    analysis: {
      week:  { lastRun: analysisByPeriod.week?.generated_at  ?? null, status: analysisByPeriod.week?.status  ?? null },
      month: { lastRun: analysisByPeriod.month?.generated_at ?? null, status: analysisByPeriod.month?.status ?? null },
      year:  { lastRun: analysisByPeriod.year?.generated_at  ?? null, status: analysisByPeriod.year?.status  ?? null },
    },
    schedule: "12:00 IST daily",
  });
});
