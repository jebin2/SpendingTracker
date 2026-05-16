export const duplicatesApi = {
  detect: () => fetch("/api/duplicates/detect", { method: "POST" }),
};
