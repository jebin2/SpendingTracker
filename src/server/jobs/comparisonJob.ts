import { compareMerchants } from "@/lib/ai/compare";
import { getPeriodRange } from "@/lib/date/periods";
import { getTransactions, storeAnalysisInDrive, upsertAnalysisCacheRow } from "@/lib/sheets";
import { compareKey } from "@/server/services/comparisonService";
import type { SheetSession } from "@/server/services/types";

const COMPARE_CELL_LIMIT = 40000;

export async function runComparisonJob(
  session: SheetSession,
  merchants: string[],
  period: string,
  region: string
): Promise<void> {
  const key = compareKey(merchants, period);
  try {
    const { from, to } = getPeriodRange(period);
    const allTx = await getTransactions(session.accessToken, session.sheetId);
    const filtered = allTx.filter((t) => t.date >= from && t.date <= to);
    const result = await compareMerchants(merchants, filtered, period, region);
    const json = JSON.stringify(result);
    const needsDrive = json.length > COMPARE_CELL_LIMIT;
    const driveFileId = needsDrive
      ? await storeAnalysisInDrive(session.accessToken, session.sheetId, key, json)
      : "";
    await upsertAnalysisCacheRow(
      session.accessToken, session.sheetId, key, "compare", "done",
      needsDrive ? "" : json, driveFileId
    );
  } catch (err) {
    console.error("Comparison job failed:", err);
    await upsertAnalysisCacheRow(session.accessToken, session.sheetId, key, "compare", "failed").catch(() => {});
  }
}
