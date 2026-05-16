import { compareMerchants } from "@/lib/ai/compare";
import { getPeriodRange } from "@/lib/date/periods";
import { getAllTransactions, storeAnalysisInDrive, upsertAnalysisCacheRow } from "@/lib/sheets";
import { compareKey } from "@/server/services/comparisonService";
import { log } from "@/lib/logger";
import type { SheetSession } from "@/server/services/types";

const COMPARE_CELL_LIMIT = 40000;

export async function runComparisonJob(
  session: SheetSession,
  merchants: string[],
  period: string,
  region: string
): Promise<void> {
  const key = compareKey(merchants, period);
  log.info("compare", `started`, { merchants: merchants.join(","), period });
  try {
    const { from, to } = getPeriodRange(period);
    const allTx = await getAllTransactions(session.accessToken, session.sheetId);
    const filtered = allTx.filter((t) => t.date >= from && t.date <= to);
    log.info("compare", `running AI on ${filtered.length} transactions`);
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
    log.info("compare", `done`, { key, drive: needsDrive });
  } catch (err) {
    log.error("compare", "failed", err, { key });
    await upsertAnalysisCacheRow(session.accessToken, session.sheetId, key, "compare", "failed").catch(() => {});
  }
}
