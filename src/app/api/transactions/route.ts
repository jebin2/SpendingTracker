import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { appendTransaction, getTransactions } from "@/lib/sheets";
import { apiError } from "@/lib/api-error";
import type { Transaction } from "@/types";

export async function GET() {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { accessToken, sheetId } = result.session;
  try {
    const transactions = await getTransactions(accessToken, sheetId);
    return NextResponse.json({ transactions });
  } catch (err) {
    return apiError("GET transactions error", err);
  }
}

export async function POST(req: NextRequest) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { accessToken, sheetId } = result.session;
  const { transaction } = await req.json() as { transaction: Transaction };
  try {
    const now = new Date().toISOString();
    const tx: Transaction = {
      ...transaction,
      id: transaction.id || crypto.randomUUID(),
      created_at: transaction.created_at || now,
      updated_at: now,
    };
    await appendTransaction(accessToken, sheetId, tx);
    return NextResponse.json({ transaction: tx });
  } catch (err) {
    return apiError("POST transaction error", err);
  }
}
