import {
  getAnalysisCache,
  getAnalysisFromDrive,
  upsertAnalysisCacheRow,
} from "@/lib/sheets";
import type { AnalysisResult } from "@/types";
import type { SheetSession } from "./types";
import { runAnalysisJob } from "@/server/jobs/analysisJob";

const CACHE_FRESH_MS = 24 * 60 * 60 * 1000;

interface AnalysisRequest {
  period?: string;
  region?: string;
  lifestyle_tags?: string[];
  force_refresh?: boolean;
}

type AnalysisResponse =
  | { status: "not_started" | "generating" | "failed" }
  | { status: "done"; analysis: AnalysisResult; generated_at: string };

async function readCachedAnalysis(
  session: SheetSession,
  period: string
): Promise<AnalysisResponse> {
  const cached = await getAnalysisCache(session.accessToken, session.sheetId, period, Infinity);
  if (!cached) return { status: "not_started" };
  if (cached.status === "generating") return { status: "generating" };
  if (cached.status === "failed") return { status: "failed" };

  let summaryJson = cached.summary_json;
  if (!summaryJson && cached.drive_file_id) {
    summaryJson = await getAnalysisFromDrive(session.accessToken, cached.drive_file_id);
  }

  return {
    status: "done",
    analysis: JSON.parse(summaryJson) as AnalysisResult,
    generated_at: cached.generated_at,
  };
}


export async function getAnalysisStatus(
  session: SheetSession,
  period: string
): Promise<AnalysisResponse> {
  return readCachedAnalysis(session, period);
}

export async function requestAnalysis(
  session: SheetSession,
  request: AnalysisRequest
): Promise<AnalysisResponse> {
  const period = request.period ?? "month";
  const current = await getAnalysisCache(session.accessToken, session.sheetId, period, Infinity);

  if (current?.status === "generating") {
    return { status: "generating" };
  }

  if (!request.force_refresh && current?.status === "done") {
    const ageMs = Date.now() - new Date(current.generated_at).getTime();
    if (ageMs < CACHE_FRESH_MS) {
      return readCachedAnalysis(session, period);
    }
  }

  await upsertAnalysisCacheRow(session.accessToken, session.sheetId, period, period, "generating");

  runAnalysisJob(session, period, request.region ?? "", request.lifestyle_tags ?? []).catch(() => {});

  return { status: "generating" };
}
