import { analyzeSpending } from "@/lib/ai/analyze";
import { getPeriodRange } from "@/lib/date/periods";
import { getTransactions, storeAnalysisInDrive, upsertAnalysisCacheRow } from "@/lib/sheets";
import type { SheetSession } from "@/server/services/types";

const ANALYSIS_CELL_LIMIT = 40000;

export async function runAnalysisJob(
  session: SheetSession,
  period: string,
  region: string,
  lifestyleTags: string[]
): Promise<void> {
  const { from, to, label } = getPeriodRange(period);
  try {
    const allTx = await getTransactions(session.accessToken, session.sheetId);
    const filtered = allTx.filter((t) => t.date >= from && t.date <= to);
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
  } catch (err) {
    console.error("Analysis job failed:", err);
    await upsertAnalysisCacheRow(session.accessToken, session.sheetId, period, period, "failed").catch(() => {});
  }
}
