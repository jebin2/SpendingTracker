import { formatINR } from "@/lib/format/currency";
import { getDuplicateGroups, type DuplicateGroup } from "@/features/transactions/utils/list";
import type { Transaction } from "@/types";

interface DuplicateGroupsListProps {
  transactions: Transaction[];
  dupChecking: boolean;
  dupError: string | null;
  onRetry: () => void;
  onGroupClick: (group: DuplicateGroup) => void;
}

export function DuplicateGroupsList({ transactions, dupChecking, dupError, onRetry, onGroupClick }: DuplicateGroupsListProps) {
  if (dupChecking) {
    return (
      <div className="flex flex-col items-center py-16 gap-3">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#ffcc80", borderTopColor: "#e65100" }} />
        <p style={{ fontSize: 14, color: "var(--color-on-surface-variant)" }}>AI is checking for duplicates…</p>
      </div>
    );
  }

  if (dupError) {
    return (
      <div className="flex flex-col items-center py-16 gap-4 text-center px-4">
        <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "var(--color-error-container)" }}>
          <span className="material-symbols-outlined" style={{ color: "var(--color-error)", fontSize: 28 }}>error</span>
        </div>
        <p style={{ fontSize: 16, fontWeight: 600, color: "var(--color-on-surface)" }}>Check failed</p>
        <p style={{ fontSize: 14, color: "var(--color-on-surface-variant)" }}>{dupError}</p>
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-2xl font-semibold"
          style={{ background: "var(--color-primary)", color: "#fff", fontSize: 14, cursor: "pointer" }}
        >
          Retry
        </button>
      </div>
    );
  }

  const dupGroups = getDuplicateGroups(transactions);

  if (dupGroups.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 gap-4 text-center">
        <div className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl" style={{ background: "var(--color-surface-container)" }}>✅</div>
        <p style={{ fontSize: 18, fontWeight: 600, color: "var(--color-on-surface)" }}>No duplicates found</p>
        <p style={{ fontSize: 14, color: "var(--color-on-surface-variant)" }}>All your transactions look unique</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {dupGroups.map(({ original: orig, duplicates }) => (
        <button
          key={orig.id}
          onClick={() => onGroupClick({ original: orig, duplicates })}
          className="flex items-center gap-4 p-4 rounded-2xl text-left w-full"
          style={{ background: "#fff8f0", border: "1px solid #ffe0b2" }}
        >
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "#fff3e0" }}>
            <span className="material-symbols-outlined" style={{ color: "#e65100", fontSize: 20, fontVariationSettings: "'FILL' 1" }}>content_copy</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate font-medium" style={{ color: "var(--color-on-surface)" }}>{orig.item_name || orig.merchant}</p>
            <p style={{ fontSize: 13, color: "var(--color-on-surface-variant)" }}>{orig.date} · {formatINR(orig.amount)}</p>
          </div>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full" style={{ background: "#ffcc80" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "#e65100" }}>×{duplicates.length + 1}</span>
          </div>
        </button>
      ))}
    </div>
  );
}
