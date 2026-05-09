"use client";

import { useEffect } from "react";
import { useAppStore } from "@/store";
import {
  getLocalTransactions,
  pullTransactions,
  flushQueue,
  pendingCount,
} from "@/lib/offline";

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const { setTransactions, setOnline, setPendingCount, setSyncing } = useAppStore();

  async function sync() {
    if (useAppStore.getState().syncing) return;
    setSyncing(true);
    try {
      const txs = await pullTransactions();
      setTransactions(txs);
    } catch (err) {
      if (err instanceof Error && err.message === "auth_expired") return;
    } finally {
      setSyncing(false);
    }
  }

  // Single function used by BOTH app-start (already online) and the online event.
  // Keeps the logic in one place and eliminates the race between the two paths.
  async function goOnline() {
    setOnline(true);
    let lastCount = -1;
    while (true) {
      const result = await flushQueue();
      if (result.authExpired) { setPendingCount(0); return; }
      const count = await pendingCount();
      setPendingCount(count);
      if (count === 0 || count === lastCount) break;
      lastCount = count;
    }
    await sync();
  }

  useEffect(() => {
    (async () => {
      try {
        const localTxs = await getLocalTransactions();
        if (localTxs.length > 0) setTransactions(localTxs);

        const count = await pendingCount();
        if (count > 0) setPendingCount(count);
      } catch (err) {
        console.error("SyncProvider: failed to load local data:", err);
      }

      if (navigator.onLine) {
        await goOnline();
      } else {
        setOnline(false);
      }
    })();

    const handleOffline = () => setOnline(false);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", handleOffline);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <>{children}</>;
}
