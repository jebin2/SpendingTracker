"use client";

import { useCallback } from "react";
import { useTransactionsStore } from "@/store/transactionsStore";
import { pullTransactions } from "@/lib/offline";

export function useTransactions() {
  const transactions = useTransactionsStore((s) => s.transactions);
  const setTransactions = useTransactionsStore((s) => s.setTransactions);
  const syncing = useTransactionsStore((s) => s.syncing);
  const setSyncing = useTransactionsStore((s) => s.setSyncing);

  const refresh = useCallback(async () => {
    if (useTransactionsStore.getState().syncing) {
      return useTransactionsStore.getState().transactions;
    }
    setSyncing(true);
    try {
      const txs = await pullTransactions();
      setTransactions(txs);
      return txs;
    } catch {
      return useTransactionsStore.getState().transactions;
    } finally {
      setSyncing(false);
    }
  }, [setTransactions, setSyncing]);

  return { transactions, refresh, syncing };
}
