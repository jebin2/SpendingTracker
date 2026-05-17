"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Transaction } from "@/types";
import { receiptsApi } from "@/lib/api/receipts";

export function useReceiptProcessingPoller(
  transactions: Transaction[],
  isOnline: boolean,
  loadData: () => Promise<Transaction[]>
) {
  const region = typeof window !== "undefined" ? localStorage.getItem("region") ?? "" : "";
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const processingRef = useRef<Set<string>>(new Set());

  const triggerProcessing = useCallback(
    async (txs: Transaction[]) => {
      const queued = txs.filter((t) => t.status === "queued" && !processingRef.current.has(t.id));
      for (const tx of queued) {
        processingRef.current.add(tx.id);
        receiptsApi.process(tx.id, region).catch(() => processingRef.current.delete(tx.id));
      }
    },
    [region]
  );

  useEffect(() => {
    const hasInFlight = transactions.some(
      (t) => t.status === "queued" || t.status === "processing" || t.status === "merging"
    );
    const shouldPoll = hasInFlight && isOnline;

    if (shouldPoll && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const txs = await loadData();
        triggerProcessing(txs);
        const stillInFlight = txs.some(
          (t) => t.status === "queued" || t.status === "processing" || t.status === "merging"
        );
        if (!stillInFlight && pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      }, 5000);
    }

    if (!shouldPoll && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };
  }, [transactions, loadData, triggerProcessing, isOnline]);

  return { triggerProcessing, region };
}
