"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import type { Transaction } from "@/types";
import { useTransactions } from "@/hooks/useTransactions";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  filterAndSortTransactions,
  getTransactionCategories,
  groupTransactionsByDate,
  type DatePreset,
} from "@/features/transactions/utils/list";
import { TransactionSheet } from "@/components/transactions/TransactionSheet";
import { useTransactionSuggestions } from "@/features/transactions/hooks/useTransactionSuggestions";
import { useReceiptProcessingPoller } from "@/features/transactions/hooks/useReceiptProcessingPoller";
import { useDuplicateResolution } from "@/features/transactions/hooks/useDuplicateResolution";
import { InFlightReceiptBanner } from "@/features/transactions/components/InFlightReceiptBanner";
import { TransactionFilters } from "@/features/transactions/components/TransactionFilters";
import { TransactionGroups } from "@/features/transactions/components/TransactionGroups";
import { DuplicateGroupsList } from "@/features/transactions/components/DuplicateGroupsList";
import { SuggestionsSheet } from "@/features/transactions/components/SuggestionsSheet";
import { DuplicateGroupSheet } from "@/features/transactions/components/DuplicateGroupSheet";

function TransactionsContent() {
  const searchParams = useSearchParams();
  const isOnline = useOnlineStatus();
  const { transactions, refresh } = useTransactions();
  const [loading, setLoading] = useState(transactions.length === 0);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState("");
  const [showDupsOnly, setShowDupsOnly] = useState(searchParams.get("duplicates_only") === "true");
  const [datePreset, setDatePreset] = useState<DatePreset>("");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const loadData = useCallback(async () => {
    try {
      return await refresh();
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { suggestions, activeSuggTxId, setActiveSuggTxId, loadSuggestions, handleSuggestion } =
    useTransactionSuggestions(loadData);
  const { triggerProcessing, region } = useReceiptProcessingPoller(transactions, isOnline, loadData);
  const { dupChecking, dupError, activeDupGroup, setActiveDupGroup, triggerDupDetect, resolveDuplicate, dismissGroup } =
    useDuplicateResolution(loadData);

  useEffect(() => {
    loadData().then((txs) => {
      triggerProcessing(txs);
      loadSuggestions(txs);
    });
  }, [loadData, triggerProcessing, loadSuggestions]);

  const categories = getTransactionCategories(transactions);
  const filtered = filterAndSortTransactions(transactions, { search, category: filterCat, showDuplicatesOnly: showDupsOnly, datePreset, customFrom, customTo });
  const groups = groupTransactionsByDate(filtered);
  const sortedDates = Object.keys(groups).sort((a, b) => b.localeCompare(a));
  const inFlightCount = transactions.filter((t) => t.status === "queued" || t.status === "processing").length;

  return (
    <div className="max-w-2xl mx-auto px-5 pt-6 pb-8 flex flex-col gap-4">
      <h1 className="hidden md:block font-bold" style={{ fontSize: 24, color: "var(--color-on-background)" }}>Transactions</h1>

      <InFlightReceiptBanner count={inFlightCount} />

      <TransactionFilters
        search={search} onSearchChange={setSearch}
        filterCat={filterCat} onCatChange={setFilterCat}
        showDupsOnly={showDupsOnly}
        onDupsToggle={() => { const next = !showDupsOnly; setShowDupsOnly(next); if (next) triggerDupDetect(); }}
        dupChecking={dupChecking}
        datePreset={datePreset} onDatePresetChange={setDatePreset}
        customFrom={customFrom} onCustomFromChange={setCustomFrom}
        customTo={customTo} onCustomToChange={setCustomTo}
        categories={categories}
      />

      {loading && transactions.length === 0 ? (
        <div className="flex flex-col gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-16 rounded-2xl animate-pulse" style={{ background: "var(--color-surface-container)" }} />
          ))}
        </div>
      ) : showDupsOnly ? (
        <DuplicateGroupsList
          transactions={transactions}
          dupChecking={dupChecking}
          dupError={dupError}
          onRetry={triggerDupDetect}
          onGroupClick={setActiveDupGroup}
        />
      ) : (
        <TransactionGroups
          sortedDates={sortedDates}
          groups={groups}
          suggestions={suggestions}
          onSuggestionsClick={setActiveSuggTxId}
          onTransactionClick={setSelectedTx}
          onResolveDuplicate={resolveDuplicate}
          searchActive={!!search}
          onRetryReceipt={async (txId) => {
            await fetch("/api/receipts/process", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ txId, region }),
            });
            loadData();
          }}
        />
      )}

      {activeSuggTxId && (
        <SuggestionsSheet
          txId={activeSuggTxId}
          suggestions={suggestions}
          onAction={handleSuggestion}
          onClose={() => setActiveSuggTxId(null)}
        />
      )}

      {selectedTx && (
        <TransactionSheet tx={selectedTx} onClose={() => setSelectedTx(null)} />
      )}

      {activeDupGroup && (
        <DuplicateGroupSheet
          group={activeDupGroup}
          onRemove={(tx) => resolveDuplicate(tx, "remove")}
          onDismissAll={() => dismissGroup(activeDupGroup)}
          onClose={() => setActiveDupGroup(null)}
        />
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return <Suspense><TransactionsContent /></Suspense>;
}
