import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import Anthropic from "@anthropic-ai/sdk";
import type { ContentBlockParam } from "@anthropic-ai/sdk/resources/messages";
import { todayISO } from "@/lib/date/iso";

const SYSTEM_PROMPT = `You are a bank statement parser for an Indian spending tracker.
Extract all debit transactions from the provided bank statement PDF.

Respond with valid JSON only:
{
  "transactions": [
    {
      "date": "YYYY-MM-DD",
      "amount": number (INR, positive for debits),
      "merchant": string (payee/description, cleaned up),
      "category": string (one of: Food & Dining, Transport, Shopping, Entertainment, Health, Bills & Utilities, Education, Personal Care, Gifts & Donations, Others),
      "payment_method": "UPI" | "Card" | "NetBanking" | "Cash" | "Other",
      "notes": string or null (reference number or original description)
    }
  ]
}

Rules:
- Only include debits (money going out), not credits (incoming money)
- Clean up merchant names (e.g. "UPI/918888/SWIGGY" → "Swiggy")
- If a transaction description is unclear, put it in notes and set merchant to the raw description
- Infer category from merchant name when possible`;

export const maxDuration = 120;

export const POST = withSession("POST parse statement", async (_session, req) => {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 });
  if (file.type !== "application/pdf") {
    return NextResponse.json({ error: "Only PDF files are supported" }, { status: 400 });
  }
  if (file.size > 20 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
  }

  const base64 = Buffer.from(await file.arrayBuffer()).toString("base64");

  const client = new Anthropic();
  const msg = await client.messages.create({
    model: process.env.AI_MODEL ?? "claude-sonnet-4-6",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          } as ContentBlockParam,
          { type: "text", text: `Today's date is ${todayISO()}. Extract all debit transactions from this bank statement.` } as ContentBlockParam,
        ],
      },
    ],
  });

  const block = msg.content[0];
  if (block.type !== "text") return NextResponse.json({ error: "Unexpected AI response" }, { status: 500 });

  const jsonMatch = block.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return NextResponse.json({ error: "Could not parse AI response" }, { status: 500 });

  const parsed = JSON.parse(jsonMatch[0]) as {
    transactions: {
      date: string; amount: number; merchant: string;
      category: string; payment_method: string; notes: string | null;
    }[];
  };

  return NextResponse.json({ transactions: parsed.transactions ?? [] });
});
