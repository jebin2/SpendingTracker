const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export const receiptsApi = {
  upload: (formData: FormData) =>
    fetch("/api/receipts/upload", { method: "POST", body: formData }),

  process: (txId: string, region: string) =>
    fetch("/api/receipts/process", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ txId, region }),
    }),
};
