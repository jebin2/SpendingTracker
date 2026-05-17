import { NextRequest, NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { requestEmailImport } from "@/server/services/emailImportService";
import { runEmailImportJob } from "@/server/jobs/emailImportJob";
import { runDuplicateDetection } from "@/server/services/duplicateDetectionService";
import { runAnalysisJob } from "@/server/jobs/analysisJob";
import { getMetaValues } from "@/lib/sheets";
import { log } from "@/lib/logger";

export const maxDuration = 300;

const ANALYSIS_PERIODS = ["week", "month", "year"] as const;

async function runAllAnalysis(session: Parameters<typeof runAnalysisJob>[0]): Promise<string> {
  const meta = await getMetaValues(session.accessToken, session.sheetId).catch(() => ({} as Record<string, string>));
  const region = meta.region ?? "";
  const lifestyleTags: string[] = meta.lifestyle_tags ? JSON.parse(meta.lifestyle_tags ?? "[]") : [];
  const results: string[] = [];
  for (const period of ANALYSIS_PERIODS) {
    try {
      await runAnalysisJob(session, period, region, lifestyleTags);
      results.push(`${period}=done`);
    } catch {
      results.push(`${period}=failed`);
    }
  }
  return results.join(" ");
}

// POST /api/cron/run?job=all|email|dedup|analysis
// Manually triggers scheduled jobs with the current browser session.
export const POST = withSession("POST cron/run", async (session, req: NextRequest) => {
  const job = new URL(req.url).searchParams.get("job") ?? "all";

  if (job === "all") {
    log.info("cron", "manual run all — email → dedup → analysis (sequential)");
    const results: Record<string, string> = {};

    try {
      const r = await runEmailImportJob(session, { manual: true });
      results.email = `done (scanned=${r.scanned} imported=${r.imported} skipped=${r.skipped})`;
    } catch (err) {
      log.error("cron", "email import failed", err);
      results.email = "failed";
    }

    try {
      await runDuplicateDetection(session);
      results.dedup = "done";
    } catch (err) {
      log.error("cron", "dedup failed", err);
      results.dedup = "failed";
    }

    try {
      results.analysis = await runAllAnalysis(session);
    } catch (err) {
      log.error("cron", "analysis failed", err);
      results.analysis = "failed";
    }

    log.info("cron", "manual run all complete", results);
    return NextResponse.json({ ok: true, results });
  }

  if (job === "email") {
    log.info("cron", "manual run email");
    requestEmailImport(session, { manual: true });
    return NextResponse.json({ ok: true, job: "email", status: "started (background)" });
  }

  if (job === "dedup") {
    log.info("cron", "manual run dedup");
    await runDuplicateDetection(session);
    return NextResponse.json({ ok: true, job: "dedup", status: "done" });
  }

  if (job === "analysis") {
    log.info("cron", "manual run analysis — week, month, year");
    const result = await runAllAnalysis(session);
    return NextResponse.json({ ok: true, job: "analysis", status: result });
  }

  return NextResponse.json({ error: "Unknown job" }, { status: 400 });
});
