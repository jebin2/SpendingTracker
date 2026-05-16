import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { SignJWT } from "jose";
import { getMetaValues, setMetaValue } from "@/lib/sheets";

const SECRET = new TextEncoder().encode(process.env.JWT_SECRET ?? "change-me");

async function generateToken(email: string, sheetId: string): Promise<string> {
  return new SignJWT({ email, sheetId, purpose: "shortcut" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .sign(SECRET);
}

export const GET = withSession("GET token", async (session) => {
  const { accessToken, sheetId, userEmail } = session;
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const meta = await getMetaValues(accessToken, sheetId);
  if (meta.shortcut_token) return NextResponse.json({ token: meta.shortcut_token });
  const token = await generateToken(userEmail, sheetId);
  await setMetaValue(accessToken, sheetId, "shortcut_token", token);
  return NextResponse.json({ token });
});

export const POST = withSession("POST token", async (session) => {
  const { accessToken, sheetId, userEmail } = session;
  if (!userEmail) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const token = await generateToken(userEmail, sheetId);
  await setMetaValue(accessToken, sheetId, "shortcut_token", token);
  return NextResponse.json({ token });
});
