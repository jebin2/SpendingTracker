import { generateText } from "./client";
import { tryParseAiJson } from "./parseJson";
import type { ParsedTransaction, PaymentMethod } from "@/types";

const EMAIL_SYSTEM_PROMPT = `You are a financial transaction extractor for Indian payment-related emails.

Extract ONLY debit transactions — money leaving the user's account (purchases, bills, transfers out).
Ignore: credit transactions, refunds, incoming transfers, balance alerts, reward points, promotional emails.

Field rules:
- amount: actual amount PAID/DEBITED in INR (positive number). Never use "available balance", "MRP", "you saved", reward points.
- merchant: the payee/store name. Clean up noise: "UPI/SWIGGY/123456" → "Swiggy", "POS/AMAZON.IN" → "Amazon", VPA "zomato@upi" → "Zomato". For person-to-person transfers (NEFT/IMPS/RTGS), use the recipient name.
- category: one of — Food & Dining, Transport, Shopping, Entertainment, Health, Bills & Utilities, Education, Personal Care, Gifts & Donations, Others.
- payment_method: UPI | Card | NetBanking | Cash | Other.
- date: YYYY-MM-DD. Transaction date, not the email received date.
- time: HH:MM 24h. Use "00:00" if absent.
- item_name: specific product/service purchased. Examples: "Airtel Mobile Recharge", "Zomato Order #123", "Electricity Bill May 2026", "Netflix Monthly", "Amazon Purchase". Omit (null) for generic transfers where no specific item is identifiable.
- notes: transaction/reference ID or any other useful detail not captured elsewhere. Examples: "Ref: 123456789", "UPI Ref: TXN9876", "Order #AMZ-123". Omit (null) if nothing useful.
- confidence: 0–1. Set below 0.65 if amount, merchant, or date is ambiguous.
- uncertain_fields: array of field names you are unsure about, e.g. ["date", "merchant"].

Return null (not JSON) if:
- Credit / incoming transaction
- No clear debit amount
- Merchant cannot be determined
- Promotional, newsletter, or non-transaction email
- Confidence would be below 0.65

Respond with valid JSON only — no markdown fences, no explanation:
{
  "amount": number,
  "merchant": string,
  "category": string,
  "payment_method": string,
  "date": "YYYY-MM-DD",
  "time": "HH:MM",
  "item_name": string | null,
  "notes": string | null,
  "confidence": number,
  "uncertain_fields": string[]
}`;

// ── HTML / text extraction ────────────────────────────────────────────────────

// Extract readable plain text from email body (HTML or plain text).
export function extractEmailText(rawBody: string, mimeType: string): string {
  let text = rawBody;

  if (mimeType.includes("html")) {
    // Remove style and script blocks entirely
    text = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ");
    text = text.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ");
    // Remove HTML comments
    text = text.replace(/<!--[\s\S]*?-->/g, " ");
    // Convert <br> and block elements to newlines
    text = text.replace(/<br\s*\/?>/gi, "\n");
    text = text.replace(/<\/?(div|p|tr|li|h[1-6]|section|article)[^>]*>/gi, "\n");
    // Remove all remaining tags
    text = text.replace(/<[^>]+>/g, " ");
    // Decode common HTML entities
    text = text
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&nbsp;/g, " ")
      .replace(/&#8377;/g, "₹")
      .replace(/&apos;/g, "'")
      .replace(/&quot;/g, '"');
  }

  // Collapse whitespace and trim
  return text.replace(/\s+/g, " ").trim();
}

// ── Transaction signal check ──────────────────────────────────────────────────

// Fast pre-check before calling AI: text must contain at least one money-related signal.
const TRANSACTION_SIGNALS = /debited|credited|paid|transaction|charged|₹|inr|rs\.|rupee|amount|payment/i;

function hasTransactionSignal(text: string): boolean {
  return TRANSACTION_SIGNALS.test(text);
}

// ── Validation gauntlet ───────────────────────────────────────────────────────

const VALID_PAYMENT_METHODS: PaymentMethod[] = ["Cash", "UPI", "Card", "NetBanking", "Other"];
const VALID_CATEGORIES = [
  "Food & Dining", "Transport", "Shopping", "Entertainment", "Health",
  "Bills & Utilities", "Education", "Personal Care", "Gifts & Donations", "Others",
];

type RawParsed = {
  amount?: unknown;
  merchant?: unknown;
  category?: unknown;
  payment_method?: unknown;
  date?: unknown;
  time?: unknown;
  confidence?: unknown;
  item_name?: unknown;
  notes?: unknown;
  uncertain_fields?: unknown;
};

function validate(raw: RawParsed, todayDate: string): ParsedTransaction | null {
  const amount = typeof raw.amount === "number" ? raw.amount : parseFloat(String(raw.amount ?? "0"));
  if (!isFinite(amount) || amount <= 0 || amount > 500_000) return null;

  const confidence = typeof raw.confidence === "number" ? raw.confidence : 0;
  if (confidence < 0.65) return null;

  const merchant = typeof raw.merchant === "string" ? raw.merchant.trim() : "";
  if (!merchant || merchant.toLowerCase() === "unknown") return null;

  const dateStr = typeof raw.date === "string" ? raw.date : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return null;
  const txDate = new Date(dateStr + "T00:00:00");
  const today = new Date(todayDate + "T00:00:00");
  const twoYearsAgo = new Date(today); twoYearsAgo.setFullYear(today.getFullYear() - 2);
  // Allow up to 1 day in the "future" to cover users in timezones ahead of
  // the server UTC clock (e.g. IST is UTC+5:30, so emails at midnight IST
  // carry a date that looks "tomorrow" from the server's UTC perspective).
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  if (txDate > tomorrow || txDate < twoYearsAgo) return null;

  const rawPM = typeof raw.payment_method === "string" ? raw.payment_method : "Other";
  const payment_method: PaymentMethod = VALID_PAYMENT_METHODS.includes(rawPM as PaymentMethod)
    ? (rawPM as PaymentMethod)
    : "Other";

  const rawCat = typeof raw.category === "string" ? raw.category : "Others";
  const category = VALID_CATEGORIES.includes(rawCat) ? rawCat : "Others";

  return {
    merchant,
    amount,
    date: dateStr,
    time: typeof raw.time === "string" && /^\d{2}:\d{2}$/.test(raw.time) ? raw.time : "00:00",
    category,
    payment_method,
    confidence,
    item_name: typeof raw.item_name === "string" ? raw.item_name.trim() || undefined : undefined,
    notes: typeof raw.notes === "string" ? raw.notes.trim() || undefined : undefined,
    uncertain_fields: Array.isArray(raw.uncertain_fields) ? raw.uncertain_fields.map(String) : [],
    currency: "INR",
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

export interface EmailParseResult {
  transaction: ParsedTransaction | null;
  /** Why parsing was skipped if transaction is null */
  skipReason?: "no_signal" | "too_short" | "ai_null" | "validation_failed" | "parse_error";
}

export async function parseEmailTransaction(
  emailText: string,
  from: string,
  subject: string,
  region: string,
  todayDate: string
): Promise<EmailParseResult> {
  // 1. Length guard
  if (emailText.length < 80) return { transaction: null, skipReason: "too_short" };

  // 2. Signal check (fast, no AI)
  if (!hasTransactionSignal(emailText)) return { transaction: null, skipReason: "no_signal" };

  // 3. Build user prompt
  const userPrompt = [
    region ? `User is in ${region}.` : "",
    `Today's date is ${todayDate}.`,
    `From: ${from}`,
    `Subject: ${subject}`,
    `---`,
    emailText.slice(0, 4000),
  ].filter(Boolean).join("\n");

  // 4. AI call
  let raw: string;
  try {
    raw = await generateText(userPrompt, EMAIL_SYSTEM_PROMPT, 512);
  } catch {
    return { transaction: null, skipReason: "parse_error" };
  }

  // 5. Parse JSON — AI returns null for non-transaction emails
  if (/^\s*null\s*$/i.test(raw.trim())) return { transaction: null, skipReason: "ai_null" };
  const parsed = tryParseAiJson<RawParsed>(raw);
  if (!parsed) return { transaction: null, skipReason: "ai_null" };

  // 6. Validation gauntlet
  const tx = validate(parsed, todayDate);
  if (!tx) return { transaction: null, skipReason: "validation_failed" };

  return { transaction: tx };
}
