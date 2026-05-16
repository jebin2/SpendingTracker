import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { getOrCreateReceiptsFolder, uploadReceiptToDrive, appendTransaction } from "@/lib/sheets";
import type { Transaction } from "@/types";

export const maxDuration = 60;

export const POST = withSession("POST receipts upload", async (session, req) => {
  const { accessToken, sheetId } = session;
  const formData = await req.formData();
  const image = formData.get("image") as File | null;
  if (!image) return NextResponse.json({ error: "image required" }, { status: 400 });

  const mimeType = image.type || "image/jpeg";
  const buffer = Buffer.from(await image.arrayBuffer());
  const txId = crypto.randomUUID();
  const now = new Date().toISOString();
  const today = now.split("T")[0];
  const time = now.split("T")[1].slice(0, 5);
  const filename = `${today}_${txId.slice(0, 8)}.jpg`;

  const folderId = await getOrCreateReceiptsFolder(accessToken, sheetId);
  const { viewUrl } = await uploadReceiptToDrive(accessToken, folderId, buffer, filename, mimeType);
  const tx: Transaction = {
    id: txId, date: today, time, amount: 0,
    merchant: "Processing…", category: "Others", payment_method: "Other",
    source: "receipt", status: "queued", receipt_url: viewUrl,
    created_at: now, updated_at: now,
  };
  await appendTransaction(accessToken, sheetId, tx);
  return NextResponse.json({ txId, receiptUrl: viewUrl });
});
