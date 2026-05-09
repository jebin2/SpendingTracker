export function toISODate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export function todayISO(now = new Date()): string {
  return toISODate(now);
}
