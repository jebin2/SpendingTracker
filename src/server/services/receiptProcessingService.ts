import { parseReceiptImage } from "@/lib/ai/parse-image";
import { todayISO } from "@/lib/date/iso";
import {
  appendTransaction,
  downloadReceiptFromDrive,
  getTransactionById,
  getMetaValues,
  updateTransactionField,
} from "@/lib/sheets";
import { sendPushNotification } from "@/lib/push";
import type { Transaction } from "@/types";
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

function receiptItemQuantity(item: { qty: number; unit?: string | null }): string | undefined {
  if (item.qty > 1) return `${item.qty}${item.unit ? ` ${item.unit}` : ""}`;
  return item.unit ? `1 ${item.unit}` : undefined;
}

function receiptItemNotes(item: { qty: number; unit_price?: number | null }): string | undefined {
  return item.unit_price != null && item.qty > 1 ? `₹${item.unit_price}/unit` : undefined;
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
    const receipt = await parseReceiptImage(
      buffer.toString("base64"),
      toReceiptMimeType(mimeType),
      request.region,
      todayISO()
    );

    const receiptId = request.txId;
    const now = new Date().toISOString();

    for (const item of receipt.items) {
      const tx: Transaction = {
        id: crypto.randomUUID(),
        date: receipt.date,
        time: receipt.time,
        amount: item.price,
        merchant: receipt.merchant,
        category: item.category || receipt.category,
        item_name: item.name,
        payment_method: receipt.payment_method,
        source: "receipt",
        receipt_url: placeholder.receipt_url,
        receipt_id: receiptId,
        status: "done",
        quantity: receiptItemQuantity(item),
        notes: receiptItemNotes(item),
        created_at: now,
        updated_at: now,
      };

      await appendTransaction(session.accessToken, session.sheetId, tx);
    }

    await updateTransactionField(session.accessToken, session.sheetId, request.txId, {
      deleted: true,
      status: "done",
    });

    // Send push notification if user has subscribed
    const meta = await getMetaValues(session.accessToken, session.sheetId).catch(() => ({} as Record<string,string>));
    if (meta.push_subscription) {
      const merchant = receipt.merchant || "Receipt";
      const total = receipt.items.reduce((s, i) => s + i.price, 0);
      sendPushNotification(meta.push_subscription, {
        title: `${merchant} receipt processed`,
        body: `${receipt.items.length} item${receipt.items.length !== 1 ? "s" : ""} · ₹${Math.round(total).toLocaleString("en-IN")}`,
        tag: "receipt-done",
        url: "/transactions",
      }).catch(() => {}); // fire-and-forget
    }

    return { ok: true, txId: receiptId, itemCount: receipt.items.length };
  } catch (err) {
    await updateTransactionField(session.accessToken, session.sheetId, request.txId, { status: "failed" }).catch(() => {});
    throw err;
  }
}
