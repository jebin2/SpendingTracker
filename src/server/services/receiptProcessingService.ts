import { parseReceiptImage } from "@/lib/ai/parse-image";
import { todayISO } from "@/lib/date/iso";
import {
  downloadReceiptFromDrive,
  getTransactionById,
  getMetaValues,
  updateTransactionField,
} from "@/lib/sheets";
import { expandItemsToRows, itemQuantity, unitPriceNote } from "./expandItems";
import { sendPushNotification } from "@/lib/push";
import type { SheetSession } from "./types";

const VALID_RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ValidReceiptMimeType = typeof VALID_RECEIPT_MIME_TYPES[number];

interface ProcessReceiptRequest {
  txId: string;
  region?: string;
}

type ProcessReceiptResult =
  | { ok: true; txId: string; itemCount: number }
  | { error: string; status: 400 | 404 };

function receiptDriveFileId(receiptUrl: string): string | null {
  return receiptUrl.match(/\/d\/([a-zA-Z0-9_-]+)/)?.[1] ?? null;
}

function toReceiptMimeType(mimeType: string): ValidReceiptMimeType {
  return VALID_RECEIPT_MIME_TYPES.includes(mimeType as ValidReceiptMimeType)
    ? (mimeType as ValidReceiptMimeType)
    : "image/jpeg";
}

export async function processReceipt(
  session: SheetSession,
  request: ProcessReceiptRequest
): Promise<ProcessReceiptResult> {
  await updateTransactionField(session.accessToken, session.sheetId, request.txId, { status: "processing" });

  try {
    const placeholder = await getTransactionById(session.accessToken, session.sheetId, request.txId);
    if (!placeholder?.receipt_url) {
      await updateTransactionField(session.accessToken, session.sheetId, request.txId, { status: "failed" });
      return { error: "Placeholder or receipt URL not found", status: 404 };
    }

    const fileId = receiptDriveFileId(placeholder.receipt_url);
    if (!fileId) {
      await updateTransactionField(session.accessToken, session.sheetId, request.txId, { status: "failed" });
      return { error: "Could not extract file ID", status: 400 };
    }

    const { buffer, mimeType } = await downloadReceiptFromDrive(session.accessToken, fileId);
    const parsed = await parseReceiptImage(
      buffer.toString("base64"),
      toReceiptMimeType(mimeType),
      request.region,
      todayISO()
    );

    const receiptId = request.txId;
    const now = new Date().toISOString();
    const items = parsed.items ?? [];

    if (items.length > 1) {
      await expandItemsToRows(session, receiptId, {
        date: parsed.date,
        time: parsed.time,
        merchant: parsed.merchant,
        category: parsed.category,
        subcategory: parsed.subcategory,
        payment_method: parsed.payment_method,
        notes: parsed.notes,
        source: "receipt",
        receipt_url: placeholder.receipt_url,
        receipt_id: receiptId,
      }, items, now, parsed.amount);
    } else {
      const singleItem = items[0];
      await updateTransactionField(session.accessToken, session.sheetId, receiptId, {
        date:           parsed.date,
        time:           parsed.time,
        amount:         parsed.amount,
        merchant:       parsed.merchant,
        category:       parsed.category,
        subcategory:    parsed.subcategory,
        item_name:      singleItem?.name ?? parsed.item_name,
        quantity:       singleItem ? itemQuantity(singleItem.qty, singleItem.unit) : undefined,
        payment_method: parsed.payment_method,
        notes:          (singleItem ? unitPriceNote(singleItem.qty, singleItem.unit_price) : undefined) ?? parsed.notes,
        receipt_id:     receiptId,
        status:         "done",
        updated_at:     now,
      });
    }

    const meta = await getMetaValues(session.accessToken, session.sheetId).catch(() => ({} as Record<string, string>));
    if (meta.push_subscription) {
      const total = items.length > 1 ? items.reduce((s, i) => s + i.price, 0) : parsed.amount;
      sendPushNotification(meta.push_subscription, {
        title: `${parsed.merchant || "Receipt"} processed`,
        body: `${items.length || 1} item${(items.length || 1) !== 1 ? "s" : ""} · ₹${Math.round(total).toLocaleString("en-IN")}`,
        tag: "receipt-done",
        url: "/transactions",
      }).catch(() => {});
    }

    return { ok: true, txId: receiptId, itemCount: items.length || 1 };
  } catch (err) {
    await updateTransactionField(session.accessToken, session.sheetId, request.txId, { status: "failed" }).catch(() => {});
    throw err;
  }
}
