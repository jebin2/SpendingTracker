import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { updateTransactionField } from "@/lib/sheets";
import type { Transaction } from "@/types";

export const PUT = withSession<{ id: string }>("PUT transaction", async (session, req, { id }) => {
  const { updates } = await req.json() as { updates: Partial<Transaction> };
  await updateTransactionField(session.accessToken, session.sheetId, id, updates);
  return NextResponse.json({ ok: true });
});

export const PATCH = withSession<{ id: string }>("PATCH transaction", async (session, req, { id }) => {
  const updates = await req.json() as Partial<Transaction>;
  await updateTransactionField(session.accessToken, session.sheetId, id, updates);
  return NextResponse.json({ ok: true, updates });
});

export const DELETE = withSession<{ id: string }>("DELETE transaction", async (session, _req, { id }) => {
  await updateTransactionField(session.accessToken, session.sheetId, id, { deleted: true });
  return NextResponse.json({ ok: true });
});
