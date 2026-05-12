import { create } from "zustand";
import type { Transaction } from "@/types";

interface TransactionsState {
  transactions: Transaction[];
  syncing: boolean;
  setTransactions: (txs: Transaction[]) => void;
  addTransaction: (tx: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  removeTransaction: (id: string) => void;
  setSyncing: (syncing: boolean) => void;
}

export const useTransactionsStore = create<TransactionsState>((set) => ({
  transactions: [],
  syncing: false,
  setTransactions: (transactions) => set({ transactions }),
  addTransaction: (tx) => set((s) => ({ transactions: [tx, ...s.transactions] })),
  // Caller is also responsible for updating IndexedDB via patchLocalTransaction()
  updateTransaction: (id, updates) =>
    set((s) => ({ transactions: s.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
  // Caller is also responsible for updating IndexedDB via removeLocalTransaction()
  removeTransaction: (id) =>
    set((s) => ({ transactions: s.transactions.filter((t) => t.id !== id) })),
  setSyncing: (syncing) => set({ syncing }),
}));
