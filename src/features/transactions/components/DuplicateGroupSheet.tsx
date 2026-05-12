import { formatINR } from "@/lib/format/currency";
import type { DuplicateGroup } from "@/features/transactions/utils/list";
import type { Transaction } from "@/types";

interface DuplicateGroupSheetProps {
  group: DuplicateGroup;
  onRemove: (tx: Transaction) => void;
  onDismissAll: () => void;
  onClose: () => void;
}

export function DuplicateGroupSheet({ group, onRemove, onDismissAll, onClose }: DuplicateGroupSheetProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: "rgba(0,0,0,0.4)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-t-3xl overflow-hidden flex flex-col"
        style={{ background: "var(--color-surface)", maxHeight: "80vh" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3">
          <div>
            <p style={{ fontSize: 17, fontWeight: 700, color: "var(--color-on-surface)" }}>Duplicate entries</p>
            <p style={{ fontSize: 13, color: "var(--color-on-surface-variant)" }}>{group.duplicates.length + 1} entries · keep one or dismiss</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center"
            style={{ background: "var(--color-surface-container)", cursor: "pointer" }}
          >
            <span className="material-symbols-outlined" style={{ color: "var(--color-on-surface-variant)", fontSize: 18 }}>close</span>
          </button>
        </div>
        <div className="px-4 pb-4 flex flex-col gap-2 overflow-y-auto">
          {[group.original, ...group.duplicates].map((tx, i) => (
            <div
              key={tx.id}
              className="flex items-center gap-3 px-4 py-3 rounded-2xl"
              style={{
                background: i === 0 ? "var(--color-primary-fixed)" : "var(--color-surface-container-lowest)",
                border: `1px solid ${i === 0 ? "var(--color-primary-fixed-dim)" : "var(--color-surface-variant)"}`,
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
              <button
                onClick={() => onRemove(tx)}
                className="flex-shrink-0 px-3 py-1.5 rounded-xl text-sm font-medium"
                style={{ background: "var(--color-error-container)", color: "var(--color-error)", cursor: "pointer" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
        <div className="px-4 pb-6">
          <button
            onClick={onDismissAll}
            className="w-full py-3 rounded-2xl font-semibold"
            style={{ background: "var(--color-surface-container)", color: "var(--color-on-surface-variant)", fontSize: 15, cursor: "pointer" }}
          >
            Keep all (not duplicates)
          </button>
        </div>
      </div>
    </div>
  );
}
