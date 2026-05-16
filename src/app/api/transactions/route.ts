import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { appendTransaction, getTransactions, PAGE_SIZE } from "@/lib/sheets";
import type { Transaction } from "@/types";

export const GET = withSession("GET transactions", async (session, req) => {
  const { searchParams } = new URL(req.url);
  const page     = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(500, Math.max(1, parseInt(searchParams.get("pageSize") ?? String(PAGE_SIZE))));
  const { transactions, total, hasMore } = await getTransactions(session.accessToken, session.sheetId, page, pageSize);
  return NextResponse.json({ transactions, total, hasMore });
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
