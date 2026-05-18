import { generateText } from "./client";
import { parseAiJson } from "./parseJson";
import type { ParsedTransaction } from "@/types";
import { todayISO } from "@/lib/date/iso";

export const SYSTEM_PROMPT = `You are a transaction parser for an Indian spending tracker. Extract spending details from SMS, email, pasted text, or receipt images.

Always respond with valid JSON matching this schema exactly:
{
  "merchant": string,
  "amount": number (total in INR — sum of all items, or transaction total),
  "currency": "INR",
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "category": string (one of: Food & Dining, Transport, Shopping, Entertainment, Health, Bills & Utilities, Education, Personal Care, Gifts & Donations, Others),
  "subcategory": string or null,
  "items": [
    {
      "name": string,
      "qty": number,
      "unit": string or null (kg, g, L, ml, pcs, etc.),
      "price": number (total for this line = qty × unit_price),
      "unit_price": number or null (price per single unit if qty > 1),
      "category": string or null (item-specific category if different from overall)
    }
  ],
  "payment_method": one of: Cash, UPI, Card, NetBanking, Other,
  "notes": string or null,
  "confidence": number 0-1,
  "uncertain_fields": array of field names that are uncertain
}

Rules:
- If date is missing, use today's date; if time is missing, use "00:00"
- Extract EVERY line item visible (receipt lines, order items, etc.); if none, return items as []
- For UPI/bank SMS: "debited", "paid", "transferred" are expenses; merchant is the payee, not the bank
- For credit card SMS: look for "spent", "transaction", "purchase"
- amount = sum of all item prices, or the transaction total when items are not itemised
- confidence = 1.0 means everything is clear; lower if key fields are guessed`;

export async function parseTransactionText(
  text: string,
  userRegion?: string,
  todayDate?: string
): Promise<ParsedTransaction> {
  const userContext = [
    userRegion ? `User is in ${userRegion}.` : "",
    todayDate ? `Today's date is ${todayDate}.` : `Today's date is ${todayISO()}.`,
  ].filter(Boolean).join(" ");

  const raw = await generateText(
    `${userContext}\n\nParse this text:\n\n${text}`,
    SYSTEM_PROMPT,
    1024
  );

  return parseAiJson<ParsedTransaction>(raw);
}
