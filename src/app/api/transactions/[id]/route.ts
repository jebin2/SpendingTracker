import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { updateTransactionField, getAllTransactions } from "@/lib/sheets";
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
  // If other transactions point to this one as their duplicate original, clear their flags
  // so they don't show orphaned Keep/Remove buttons after deletion.
  const allTxs = await getAllTransactions(session.accessToken, session.sheetId);
  const orphaned = allTxs.filter((t) => t.duplicate_ref === id && t.is_duplicate);
  if (orphaned.length > 0) {
    await Promise.all(
      orphaned.map((t) =>
        updateTransactionField(session.accessToken, session.sheetId, t.id, {
          is_duplicate: false,
          duplicate_ref: undefined,
        })
      )
    );
  }

  await updateTransactionField(session.accessToken, session.sheetId, id, { deleted: true });
  return NextResponse.json({ ok: true });
});
