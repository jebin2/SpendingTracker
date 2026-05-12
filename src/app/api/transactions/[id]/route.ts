import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { updateTransactionField } from "@/lib/sheets";
import { apiError } from "@/lib/api-error";
import type { Transaction } from "@/types";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { accessToken, sheetId } = result.session;
  const { id } = await params;
  const { updates } = await req.json() as { updates: Partial<Transaction> };
  try {
    await updateTransactionField(accessToken, sheetId, id, updates);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError("PUT transaction error", err);
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { accessToken, sheetId } = result.session;
  const { id } = await params;
  const updates = await req.json() as Partial<Transaction>;
  try {
    await updateTransactionField(accessToken, sheetId, id, updates);
    return NextResponse.json({ ok: true, updates });
  } catch (err) {
    return apiError("PATCH transaction error", err);
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { accessToken, sheetId } = result.session;
  const { id } = await params;
  try {
    await updateTransactionField(accessToken, sheetId, id, { deleted: true });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError("DELETE transaction error", err);
  }
}
