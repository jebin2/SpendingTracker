export function formatINR(amount: number, options: { symbol?: boolean } = {}): string {
  const { symbol = true } = options;
  const formatted = amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  return symbol ? `₹${formatted}` : formatted;
}
