import { generateText } from "./client";
import { tryParseAiJson } from "./parseJson";
import type { Transaction } from "@/types";

export async function mergeTransactions(
  transactions: Transaction[]
): Promise<Partial<Transaction>> {
  const raw = await generateText(
    `These are duplicate records of the same real-world payment. Merge them into one best transaction.

Entries (${transactions.length}):
${JSON.stringify(transactions.map((t) => ({
  id:             t.id,
  source:         t.source,
  date:           t.date,
  time:           t.time,
  amount:         t.amount,
  merchant:       t.merchant,
  category:       t.category,
  subcategory:    t.subcategory ?? "",
  item_name:      t.item_name ?? "",
  payment_method: t.payment_method,
  notes:          t.notes ?? "",
  raw_input:      t.raw_input ?? "",
  receipt_url:    t.receipt_url ?? "",
})), null, 2)}

Rules for picking the best value of each field:
- amount: prefer "receipt" source; if amounts differ within ₹30, use the receipt value
- time: prefer non-"00:00" (exact time) over "00:00" (email/shortcut default)
- merchant: prefer properly-cased name over ALL-CAPS; avoid "Unknown"
- category / subcategory: prefer the most specific non-"Others" value
- item_name: prefer the most descriptive non-empty value
- payment_method: prefer non-"Other" value
- notes: combine unique information from all entries separated by " | "; keep UPI refs
- receipt_url: keep if any entry has one (prefer non-empty)
- raw_input: keep the most informative value

Return ONLY a JSON object with the merged field values (no id, no source, no status):
{
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "amount": number,
  "merchant": "string",
  "category": "string",
  "subcategory": "string or empty",
  "item_name": "string or empty",
  "payment_method": "UPI|Cash|Card|NetBanking|Other",
  "notes": "string or empty",
  "receipt_url": "string or empty"
}`,
    "",
    512
  );

  const merged = tryParseAiJson<Partial<Transaction>>(raw, "object");
  if (!merged) throw new Error("AI returned invalid merge response");
  return merged;
}
