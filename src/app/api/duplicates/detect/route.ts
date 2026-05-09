import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getTransactions, updateTransactionField, getMetaValues, setMetaValue } from "@/lib/sheets";
import { findDuplicates } from "@/lib/ai/dedup";

const RUN_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

async function runDetection(accessToken: string, sheetId: string): Promise<void> {
  const transactions = await getTransactions(accessToken, sheetId);

  // Reset previous duplicate flags before re-running
  const previousDups = transactions.filter((t) => t.is_duplicate);
  await Promise.all(
    previousDups.map((t) =>
      updateTransactionField(accessToken, sheetId, t.id, { is_duplicate: false, duplicate_ref: undefined })
    )
  );

  const groups = await findDuplicates(transactions);

  await Promise.all(
    groups.flatMap((g) =>
      g.duplicate_ids.map((dupId) =>
        updateTransactionField(accessToken, sheetId, dupId, {
          is_duplicate: true,
          duplicate_ref: g.original_id,
        })
      )
    )
  );

  await setMetaValue(accessToken, sheetId, "last_dedup_checked_at", new Date().toISOString());
}

export async function POST() {
  const session = await auth();
  if (!session?.access_token || !session.sheet_id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meta = await getMetaValues(session.access_token, session.sheet_id);
  const lastRun = meta.last_dedup_checked_at ? new Date(meta.last_dedup_checked_at).getTime() : 0;

  if (Date.now() - lastRun < RUN_INTERVAL_MS) {
    return NextResponse.json({ skipped: true });
  }

  try {
    await runDetection(session.access_token, session.sheet_id);
    return NextResponse.json({ done: true });
  } catch (err: unknown) {
    console.error("Duplicate detection error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    const isAiError = msg.includes("API key") || msg.includes("API Key") || msg.includes("quota") || msg.includes("429") || msg.includes("503");
    return NextResponse.json(
      { error: isAiError ? "ai_unavailable" : "detection_failed" },
      { status: 500 }
    );
  }
}
