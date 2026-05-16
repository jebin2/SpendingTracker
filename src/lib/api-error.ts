import { NextResponse } from "next/server";

function isGoogleAuthError(err: unknown): boolean {
  if (typeof err !== "object" || err === null) return false;
  const e = err as Record<string, unknown>;
  return (
    e["status"] === 401 ||
    e["code"] === 401 ||
    (typeof e["cause"] === "object" && e["cause"] !== null && (e["cause"] as Record<string, unknown>)["code"] === 401) ||
    (typeof e["response"] === "object" && e["response"] !== null && (e["response"] as Record<string, unknown>)["status"] === 401)
  );
}

export function apiError(label: string, err: unknown) {
  console.error(`${label}:`, err);
  if (isGoogleAuthError(err)) {
    return NextResponse.json({ error: "auth_expired" }, { status: 401 });
  }
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}
