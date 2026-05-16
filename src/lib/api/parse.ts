const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export const parseApi = {
  text: (text: string, region: string) =>
    fetch("/api/parse/text", {
      method: "POST",
      headers: JSON_HEADERS,
      body: JSON.stringify({ text, region }),
    }),
};
