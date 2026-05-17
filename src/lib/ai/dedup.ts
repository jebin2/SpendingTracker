import { generateText } from "./client";
import { tryParseAiJson } from "./parseJson";
import type { Transaction } from "@/types";

export interface DuplicateGroup {
  original_id: string;
  duplicate_ids: string[];
  reason: string;
}

export async function findDuplicates(transactions: Transaction[]): Promise<DuplicateGroup[]> {
  // Group by date — only dates with 2+ transactions can have duplicates
  const byDate: Record<string, Transaction[]> = {};
  for (const tx of transactions) {
    (byDate[tx.date] ??= []).push(tx);
  }

  const results: DuplicateGroup[] = [];

  for (const [date, txs] of Object.entries(byDate)) {
    if (txs.length < 2) continue;

    const raw = await generateText(
      `Find duplicate transactions within this single day: ${date}

Transactions (id, merchant, item_name, amount, source, notes):
${JSON.stringify(txs.map((t) => ({
  id:        t.id,
  merchant:  t.merchant,
  item_name: t.item_name ?? "",
  amount:    t.amount,
  source:    t.source,
  notes:     t.notes ?? "",
})))}

A duplicate means the same real-world payment recorded more than once (e.g. from both a receipt scan and a bank email, or from two bank alerts for the same UPI transaction).

Rules:
1. Same merchant (fuzzy — "OPEN MART" = "OPENMART") AND same amount → duplicate.
2. Same merchant AND amount within ₹30 AND one source is "email" or "shortcut" → likely duplicate (bank alert may show net amount while payment app shows gross).
3. Notes contain the same UPI ref / bank ref number → duplicate regardless of merchant spelling or minor amount difference.
4. item_name is often empty for email imports — do NOT require matching item_name for cross-source duplicates.
5. "Unknown" merchant with amount=0 → NOT a duplicate unless notes match.
6. Pick the entry with the most detail (receipt > email > shortcut) as original_id; if equal, pick earliest time.
7. Return [] if no duplicates found.

Respond with JSON only:
[{"original_id":"...","duplicate_ids":["..."],"reason":"..."}]`,
      "",
      768
    );

    const groups = tryParseAiJson<DuplicateGroup[]>(raw, "array");
    if (!groups) continue;
    results.push(...groups.filter((g) => g.duplicate_ids?.length > 0));
  }

  return results;
}
