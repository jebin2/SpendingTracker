"use client";

import { useState } from "react";
import type { Transaction } from "@/types";
import type { DuplicateGroup } from "@/features/transactions/utils/list";
import { duplicatesApi } from "@/lib/api/duplicates";
import { transactionsApi } from "@/lib/api/transactions";

export function useDuplicateResolution(loadData: () => Promise<Transaction[]>) {
  const [dupChecking, setDupChecking] = useState(false);
  const [dupError, setDupError] = useState<string | null>(null);
  const [activeDupGroup, setActiveDupGroup] = useState<DuplicateGroup | null>(null);

  async function triggerDupDetect() {
    setDupChecking(true);
    setDupError(null);
    try {
      const res = await duplicatesApi.detect();
      const data = await res.json();
      if (!res.ok) {
        setDupError(
          data.error === "ai_unavailable"
            ? "AI service unavailable — check your API key in settings."
            : "Duplicate check failed. Please try again."
        );
      } else {
        await loadData();
      }
    } catch {
      setDupError("Network error — please try again.");
    } finally {
      setDupChecking(false);
    }
  }

  async function resolveDuplicate(tx: Transaction, action: "keep" | "remove") {
    await transactionsApi.update(tx.id, action === "remove"
      ? { deleted: true }
      : { is_duplicate: false, duplicate_ref: undefined }
    );
    setActiveDupGroup(null);
    await loadData();
  }

  async function dismissGroup(group: DuplicateGroup) {
    await Promise.all(
      group.duplicates.map((t) =>
        transactionsApi.update(t.id, { is_duplicate: false, duplicate_ref: undefined })
      )
    );
    setActiveDupGroup(null);
    await loadData();
  }

  return { dupChecking, dupError, activeDupGroup, setActiveDupGroup, triggerDupDetect, resolveDuplicate, dismissGroup };
}
