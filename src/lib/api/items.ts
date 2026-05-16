import type { PendingSuggestion } from "@/types";

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export const itemsApi = {
  getSuggestions: () => fetch("/api/items/suggestions"),

  normalize: () => fetch("/api/items/normalize", { method: "POST" }),

  resolveSuggestion: (s: Pick<PendingSuggestion, "key" | "field">, action: "accept" | "reject") =>
    fetch("/api/items/suggestions", {
      method: "PATCH",
      headers: JSON_HEADERS,
      body: JSON.stringify({ key: s.key, field: s.field, action }),
    }),
};
