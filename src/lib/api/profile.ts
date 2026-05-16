const JSON_HEADERS = { "Content-Type": "application/json" } as const;

export const profileApi = {
  get: () => fetch("/api/user/profile"),

  update: (fields: Record<string, string>) =>
    fetch("/api/user/profile", {
      method: "PUT",
      headers: JSON_HEADERS,
      body: JSON.stringify(fields),
    }),
};
