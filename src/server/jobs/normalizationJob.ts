import { runItemNormalization } from "@/server/services/itemNormalizationService";
import type { SheetSession } from "@/server/services/types";

export async function runNormalizationJob(session: SheetSession): Promise<void> {
  await runItemNormalization(session);
}
