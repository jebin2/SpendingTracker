export const duplicatesApi = {
  detect: () => fetch("/api/duplicates/detect", { method: "POST" }),
  merge:  (transactionIds: string[]) =>
    fetch("/api/duplicates/merge", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ transactionIds }),
    }),
};
