import { analyzeSpending } from "@/lib/ai/analyze";
import { getPeriodRange } from "@/lib/date/periods";
import { getAllTransactions, storeAnalysisInDrive, upsertAnalysisCacheRow } from "@/lib/sheets";
import { log } from "@/lib/logger";
import type { SheetSession } from "@/server/services/types";

const ANALYSIS_CELL_LIMIT = 40000;

export async function runAnalysisJob(
  session: SheetSession,
  period: string,
  region: string,
  lifestyleTags: string[]
): Promise<void> {
  const { from, to, label } = getPeriodRange(period);
  log.info("analysis", `started`, { period, from, to });
  try {
    const allTx = await getAllTransactions(session.accessToken, session.sheetId);
    const filtered = allTx.filter((t) => t.date >= from && t.date <= to);
    log.info("analysis", `running AI on ${filtered.length} transactions`);
    const result = await analyzeSpending(filtered, label, region, lifestyleTags);
    const json = JSON.stringify(result);
    const needsDrive = json.length > ANALYSIS_CELL_LIMIT;
    const driveFileId = needsDrive
      ? await storeAnalysisInDrive(session.accessToken, session.sheetId, period, json)
      : "";
    await upsertAnalysisCacheRow(
      session.accessToken, session.sheetId, period, period, "done",
      needsDrive ? "" : json, driveFileId
    );
    log.info("analysis", `done`, { period, drive: needsDrive });
  } catch (err) {
    log.error("analysis", "failed", err, { period });
    await upsertAnalysisCacheRow(session.accessToken, session.sheetId, period, period, "failed").catch(() => {});
  }
}
