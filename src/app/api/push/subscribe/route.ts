import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { setMetaValue, getMetaValues } from "@/lib/sheets";

export const POST = withSession("POST push subscribe", async (session, req) => {
  const subscription = await req.json();
  await setMetaValue(session.accessToken, session.sheetId, "push_subscription", JSON.stringify(subscription));
  return NextResponse.json({ ok: true });
});

export const DELETE = withSession("DELETE push subscribe", async (session) => {
  const meta = await getMetaValues(session.accessToken, session.sheetId);
  if (meta.push_subscription) {
    await setMetaValue(session.accessToken, session.sheetId, "push_subscription", "");
  }
  return NextResponse.json({ ok: true });
});
