import type { Transaction } from "@/types";

export const TRANSACTIONS_URL = "/api/transactions" as const;
export const transactionUrl = (id: string) => `/api/transactions/${id}` as const;

type TransactionPayload = Omit<Transaction, "created_at" | "updated_at"> & {
  created_at?: string;
  updated_at?: string;
};

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export const transactionsApi = {
  list: () => fetch(TRANSACTIONS_URL),

  create: (tx: TransactionPayload) =>
    fetch(TRANSACTIONS_URL, {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ transaction: tx }),
    }),

  update: (id: string, updates: Partial<Transaction>) =>
    fetch(transactionUrl(id), {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify({ updates }),
    }),

  patch: (id: string, updates: Partial<Transaction>) =>
    fetch(transactionUrl(id), {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify(updates),
    }),

  delete: (id: string) => fetch(transactionUrl(id), { method: "DELETE" }),
};
