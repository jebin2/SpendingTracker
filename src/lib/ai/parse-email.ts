import { generateText } from "./client";
import { tryParseAiJson } from "./parseJson";
import type { ParsedTransaction, PaymentMethod } from "@/types";

import { SYSTEM_PROMPT as BANK_DEBIT_PROMPT }   from "./prompts/email-bank-debit";
import { SYSTEM_PROMPT as PAYMENT_APP_PROMPT }   from "./prompts/email-payment-app";
import { SYSTEM_PROMPT as ECOMMERCE_PROMPT }     from "./prompts/email-ecommerce";
import { SYSTEM_PROMPT as CREDIT_CARD_PROMPT }   from "./prompts/email-credit-card";
import { SYSTEM_PROMPT as GENERIC_PROMPT }       from "./prompts/email-generic";

// ── Category detection ────────────────────────────────────────────────────────

type EmailCategory = "bank-debit" | "payment-app" | "ecommerce" | "credit-card" | "generic";

function detectCategory(from: string, subject: string): EmailCategory {
  const f = from.toLowerCase();
  const s = subject.toLowerCase();

  if (/hdfcbank|icicibank|sbi\.co\.in|axisbank|kotak|yesbank|indusind|idfcfirst|federalbank|rblbank/.test(f)) {
    // Distinguish credit-card alert vs bank debit alert
    if (/credit\s*card|creditcard|card\s*alert|cc\s*alert/.test(f + " " + s)) return "credit-card";
    return "bank-debit";
  }
  if (/gpay|google.*pay|phonepe|paytm|bhim|razorpay|cashfree|mobikwik/.test(f)) return "payment-app";
  if (/swiggy|zomato|amazon|flipkart|bigbasket|blinkit|myntra|ajio|nykaa|meesho|jiomart|dunzo|zepto|ola\.money|uber/.test(f)) return "ecommerce";
  if (/sbicard|hdfccc|icicicredit|axiscard|kotakcard|amex|americanexpress/.test(f)) return "credit-card";
  if (/creditcard|credit-card/.test(f + " " + s)) return "credit-card";

  return "generic";
}

function promptForCategory(cat: EmailCategory): string {
  switch (cat) {
    case "bank-debit":   return BANK_DEBIT_PROMPT;
    case "payment-app":  return PAYMENT_APP_PROMPT;
    case "ecommerce":    return ECOMMERCE_PROMPT;
    case "credit-card":  return CREDIT_CARD_PROMPT;
    default:             return GENERIC_PROMPT;
  }
}

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

  // 3. Pick prompt
  const category = detectCategory(from, subject);
  const systemPrompt = promptForCategory(category);

  const userPrompt = [
    region ? `User is in ${region}.` : "",
    `Today's date is ${todayDate}.`,
    `From: ${from}`,
    `Subject: ${subject}`,
    `---`,
    emailText.slice(0, 4000), // cap at 4k chars to stay within token budget
  ].filter(Boolean).join("\n");

  // 4. AI call
  let raw: string;
  try {
    raw = await generateText(userPrompt, systemPrompt, 512);
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
