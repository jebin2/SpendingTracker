import { Spinner } from "@/components/ui/Spinner";

interface InFlightReceiptBannerProps {
  count: number;
}

export function InFlightReceiptBanner({ count }: InFlightReceiptBannerProps) {
  if (count === 0) return null;
  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-2xl" style={{ background: "var(--color-primary-fixed)" }}>
      <Spinner size={20} color="var(--color-primary-fixed-dim)" activeColor="var(--color-primary)" />
      <p style={{ fontSize: 14, color: "var(--color-primary)", fontWeight: 500 }}>
        {count} receipt{count > 1 ? "s" : ""} being processed by AI…
      </p>
    </div>
  );
}
