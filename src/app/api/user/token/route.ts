import { NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { SignJWT } from "jose";
import { getMetaValues, setMetaValue } from "@/lib/sheets";
import { apiError } from "@/lib/api-error";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "change-me");

async function generateToken(email: string, sheetId: string): Promise<string> {
  return new SignJWT({ email, sheetId, purpose: "shortcut" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(SECRET);
}

export async function GET() {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { accessToken, sheetId, userEmail } = result.session;
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const meta = await getMetaValues(accessToken, sheetId);
    if (meta.shortcut_token) return NextResponse.json({ token: meta.shortcut_token });
    const token = await generateToken(userEmail, sheetId);
    await setMetaValue(accessToken, sheetId, "shortcut_token", token);
    return NextResponse.json({ token });
  } catch (err) {
    return apiError("GET token error", err);
  }
}

export async function POST() {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const { accessToken, sheetId, userEmail } = result.session;
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const token = await generateToken(userEmail, sheetId);
    await setMetaValue(accessToken, sheetId, "shortcut_token", token);
    return NextResponse.json({ token });
  } catch (err) {
    return apiError("POST token error", err);
  }
}
