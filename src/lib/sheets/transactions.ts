import type { Transaction } from "@/types";
import { getSheetsClient } from "./client";
import { ensureTransactionSchema } from "./init";
import {
  transactionToRow,
  rowToTransaction,
  isDeletedRow,
  transactionUpdateToCells,
  DATA_RANGE,
  ID_RANGE,
  LAST_COL,
} from "./transactionSchema";

export const PAGE_SIZE = 200;

export interface TransactionPage {
  transactions: Transaction[];
  total: number;       // total data rows in sheet (excludes header, includes soft-deleted)
  hasMore: boolean;
}

// Fetch just the ID column to count how many data rows exist.
// Cheap: single-column range with no end limit.
async function getRowCount(
  sheets: ReturnType<typeof getSheetsClient>,
  sheetId: string
): Promise<number> {
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: "transactions!A2:A",
    majorDimension: "COLUMNS",
  });
  return res.data.values?.[0]?.filter(Boolean).length ?? 0;
}

export async function appendTransaction(
  accessToken: string,
  sheetId: string,
  tx: Transaction
): Promise<void> {
  const sheets = getSheetsClient(accessToken);
  await ensureTransactionSchema(sheets, sheetId);
  await sheets.spreadsheets.values.append({
    spreadsheetId: sheetId,
    range: "transactions!A2",
    valueInputOption: "RAW",
    requestBody: { values: [transactionToRow(tx)] },
  });
}

// Fetch one page of transactions, working backwards from the end of the sheet.
// Page 1 = most recently appended rows (highest row numbers).
// Rows are in insert order, not date order — sort happens client-side.
export async function getTransactions(
  accessToken: string,
  sheetId: string,
  page = 1,
  pageSize = PAGE_SIZE
): Promise<TransactionPage> {
  const sheets = getSheetsClient(accessToken);
  const total = await getRowCount(sheets, sheetId);

  if (total === 0) return { transactions: [], total: 0, hasMore: false };

  // +1 because row 1 is the header; data starts at row 2
  const lastDataRow = total + 1;
  const endRow   = lastDataRow - (page - 1) * pageSize;
  const startRow = Math.max(2, endRow - pageSize + 1);
  const hasMore  = startRow > 2;

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: `transactions!A${startRow}:${LAST_COL}${endRow}`,
  });

  const rows = res.data.values ?? [];
  const transactions = rows
    .filter((r) => r[0])
    .filter((r) => !isDeletedRow(r as string[]))
    .map((r) => rowToTransaction(r as string[]));

  return { transactions, total, hasMore };
}

export async function getTransactionById(
  accessToken: string,
  sheetId: string,
  txId: string
): Promise<Transaction | null> {
  const { transactions } = await getTransactions(accessToken, sheetId);
  return transactions.find((t) => t.id === txId) ?? null;
}

export async function updateTransactionField(
  accessToken: string,
  sheetId: string,
  txId: string,
  updates: Partial<Transaction>
): Promise<void> {
  const sheets = getSheetsClient(accessToken);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: sheetId,
    range: ID_RANGE,
  });

  const rows = res.data.values ?? [];
  const rowIndex = rows.findIndex((r) => r[0] === txId);
  if (rowIndex < 0) return;

  const batchData = transactionUpdateToCells(updates, rowIndex + 2);
  if (batchData.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: sheetId,
      requestBody: { valueInputOption: "RAW", data: batchData },
    });
  }
}

// Fetch every transaction across all pages — for server-side analysis jobs only.
// Not suitable for client-side rendering; use getTransactions() with pagination instead.
export async function getAllTransactions(
  accessToken: string,
  sheetId: string,
  pageSize = PAGE_SIZE
): Promise<Transaction[]> {
  const all: Transaction[] = [];
  let page = 1;
  while (true) {
    const { transactions, hasMore } = await getTransactions(accessToken, sheetId, page, pageSize);
    all.push(...transactions);
    if (!hasMore) break;
    page++;
  }
  return all;
}

// Re-export DATA_RANGE so callers that already import from this file still work
export { DATA_RANGE };
