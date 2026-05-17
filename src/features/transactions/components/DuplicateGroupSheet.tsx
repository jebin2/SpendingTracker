import { formatINR } from "@/lib/format/currency";
import type { DuplicateGroup } from "@/features/transactions/utils/list";
import type { Transaction } from "@/types";
import { BottomSheet, BottomSheetHeader } from "@/components/ui/BottomSheet";

interface DuplicateGroupSheetProps {
  group: DuplicateGroup;
  onRemove: (tx: Transaction) => void;
  onDismissAll: () => void;
  onClose: () => void;
  onViewTransaction: (tx: Transaction) => void;
}

export function DuplicateGroupSheet({ group, onRemove, onDismissAll, onClose, onViewTransaction }: DuplicateGroupSheetProps) {
  return (
    <BottomSheet onClose={onClose}>
      <BottomSheetHeader
        title="Duplicate entries"
        subtitle={`${group.duplicates.length + 1} entries · tap to view · keep one or dismiss`}
        onClose={onClose}
      />
      <div className="px-4 pb-4 flex flex-col gap-2 overflow-y-auto">
        {[group.original, ...group.duplicates].map((tx, i) => (
          <button
            key={tx.id}
            onClick={() => onViewTransaction(tx)}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl w-full text-left"
            style={{
              background: i === 0 ? "var(--color-primary-fixed)" : "var(--color-surface-container-lowest)",
              border: `1px solid ${i === 0 ? "var(--color-primary-fixed-dim)" : "var(--color-surface-variant)"}`,
              cursor: "pointer",
            }}
          >
            <div className="flex-1 min-w-0">
              {i === 0 && (
                <p style={{ fontSize: 10, color: "var(--color-primary)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 2 }}>
                  Original
                </p>
              )}
              <p className="truncate font-medium" style={{ fontSize: 14, color: "var(--color-on-surface)" }}>{tx.item_name || tx.merchant}</p>
              <p style={{ fontSize: 12, color: "var(--color-on-surface-variant)" }}>{tx.date} · {tx.time} · {formatINR(tx.amount)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(tx); }}
                className="px-3 py-1.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--color-error-container)", color: "var(--color-error)", cursor: "pointer" }}
              >
                Remove
              </button>
              <span className="material-symbols-outlined" style={{ color: "var(--color-outline)", fontSize: 18 }}>chevron_right</span>
            </div>
          </button>
        ))}
      </div>
      <div className="px-4 pb-6 flex-shrink-0">
        <button
          onClick={onDismissAll}
          className="w-full py-3 rounded-2xl font-semibold"
          style={{ background: "var(--color-surface-container)", color: "var(--color-on-surface-variant)", fontSize: 15, cursor: "pointer" }}
        >
          Keep all (not duplicates)
        </button>
      </div>
    </BottomSheet>
  );
}
