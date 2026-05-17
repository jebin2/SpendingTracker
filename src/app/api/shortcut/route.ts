import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { appendTransaction, setMetaValue } from "@/lib/sheets";
import { parseTransactionText } from "@/lib/ai/parse-text";
import type { Transaction } from "@/types";
import { todayISO } from "@/lib/date/iso";
import { refreshGoogleToken } from "@/lib/googleAuth";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "change-me");

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing token" }, { status: 401 });
  }

  const token = auth.slice(7);
  let payload: { email: string; sheetId: string; region?: string; refreshToken?: string };

  try {
    const { payload: p } = await jwtVerify(token, SECRET);
    payload = p as typeof payload;
    if (!payload.email || !payload.sheetId) throw new Error("Invalid payload");
  } catch {
    return NextResponse.json({ error: "Invalid token" }, { status: 401 });
  }

  const { text, source = "shortcut" } = await req.json();
  if (!text) return NextResponse.json({ error: "text required" }, { status: 400 });

  if (!payload.refreshToken) {
    return NextResponse.json({ error: "Token is outdated — please reinstall the shortcut from the app." }, { status: 401 });
  }

  const accessToken = await refreshGoogleToken(payload.refreshToken);
  if (!accessToken) {
    return NextResponse.json({ error: "Could not authenticate — please reinstall the shortcut from the app." }, { status: 401 });
  }

  const parsed = await parseTransactionText(text, payload.region ?? "", todayISO());

  const tx: Transaction = {
    id: crypto.randomUUID(),
    date: parsed.date,
    time: parsed.time,
    amount: parsed.amount,
    merchant: parsed.merchant,
    category: parsed.category,
    subcategory: parsed.subcategory,
    item_name: parsed.item_name,
    payment_method: parsed.payment_method,
    source: source as Transaction["source"],
    raw_input: text,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await appendTransaction(accessToken, payload.sheetId, tx);
  await setMetaValue(accessToken, payload.sheetId, "shortcut_last_used", new Date().toISOString());

  return NextResponse.json({ entry: tx });
}
