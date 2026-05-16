import { google } from "googleapis";

export function getAuth(accessToken: string) {
  const auth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  auth.setCredentials({ access_token: accessToken });
  return auth;
}

export function getSheetsClient(accessToken: string) {
  return google.sheets({ version: "v4", auth: getAuth(accessToken) });
}

export function getDriveClient(accessToken: string) {
  return google.drive({ version: "v3", auth: getAuth(accessToken) });
}

// Retry wrapper for Sheets API calls — handles 429 (rate limit) and transient 5xx.
// Delays: 1s, 2s, 4s before giving up.
export async function withSheetsRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: unknown) {
      const code = (err as { code?: number })?.code;
      const isRetryable = code === 429 || code === 500 || code === 503;
      if (isRetryable && attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, attempt)));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Unreachable");
}
