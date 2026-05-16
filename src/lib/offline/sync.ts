import { offlineDb } from "./db";
import { pendingCount } from "./queue";
import type { Transaction } from "@/types";

export interface SyncPage {
  transactions: Transaction[];
  total: number;
  hasMore: boolean;
}

// Read from IndexedDB — instant, works offline
export async function getLocalTransactions(): Promise<Transaction[]> {
  return offlineDb.transactions.orderBy("date").reverse().toArray();
}

// Fetch one page from the API and persist to IndexedDB.
// Uses bulkPut only (no delete) — pages accumulate across loads.
// Soft-deleted transactions are filtered server-side so they won't re-appear.
export async function pullTransactions(page = 1, pageSize?: number): Promise<SyncPage> {
  const url = pageSize
    ? `/api/transactions?page=${page}&pageSize=${pageSize}`
    : `/api/transactions?page=${page}`;

  const res = await fetch(url);
  if (res.status === 401) throw new Error("auth_expired");
  if (!res.ok) throw new Error("fetch_failed");

  const { transactions, total, hasMore } = await res.json() as SyncPage;

  if (transactions.length > 0) {
    await offlineDb.transactions.bulkPut(transactions);
  } else if (page === 1) {
    // Page 1 returned empty — server has no transactions.
    // Only clear local if there are no pending offline ops (unsynced creates).
    const queued = await pendingCount();
    if (queued === 0) {
      await offlineDb.transactions.clear();
    }
  }

  return { transactions, total, hasMore };
}

// Persist a single transaction locally (used after optimistic write)
export async function saveLocalTransaction(tx: Transaction): Promise<void> {
  await offlineDb.transactions.put(tx);
}

// Remove a transaction from local cache
export async function removeLocalTransaction(id: string): Promise<void> {
  await offlineDb.transactions.delete(id);
}

// Patch a transaction in local cache
export async function patchLocalTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
  const existing = await offlineDb.transactions.get(id);
  if (existing) {
    await offlineDb.transactions.put({ ...existing, ...updates });
  }
}
