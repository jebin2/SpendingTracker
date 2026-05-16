import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { appendTransaction, getTransactions } from "@/lib/sheets";
import type { Transaction } from "@/types";

export const GET = withSession("GET transactions", async (session) => {
  const transactions = await getTransactions(session.accessToken, session.sheetId);
  return NextResponse.json({ transactions });
});

export const POST = withSession("POST transaction", async (session, req) => {
  const { transaction } = await req.json() as { transaction: Transaction };
  const now = new Date().toISOString();
  const tx: Transaction = {
    ...transaction,
    id: transaction.id || crypto.randomUUID(),
    created_at: transaction.created_at || now,
    updated_at: now,
  };
  await appendTransaction(session.accessToken, session.sheetId, tx);
  return NextResponse.json({ transaction: tx });
});
