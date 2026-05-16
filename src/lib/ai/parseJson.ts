export function tryParseAiJson<T>(raw: string, expectedType: "object" | "array" = "object"): T | null {
  const pattern = expectedType === "array" ? /\[[\s\S]*\]/ : /\{[\s\S]*\}/;
  const match = raw.match(pattern);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

export function parseAiJson<T>(raw: string, expectedType: "object" | "array" = "object"): T {
  const result = tryParseAiJson<T>(raw, expectedType);
  if (result === null) throw new Error("No JSON in AI response");
  return result;
}
