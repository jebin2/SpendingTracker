import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { getMetaValues } from "@/lib/sheets";
import { storeShortcutPrepare } from "@/lib/shortcutPrepare";
import { log } from "@/lib/logger";

// POST /api/shortcut/prepare
// Called by the settings page (with session cookie) just before the user taps
// "Install Shortcut". Reads the stored shortcut JWT from sheet meta, parks it
// in a 10-minute in-memory slot, and returns a short UUID that the client
// uses as the file-download URL parameter instead of the full (long) JWT.
export const POST = withSession("POST shortcut/prepare", async (session) => {
  const meta = await getMetaValues(session.accessToken, session.sheetId);
  const token = meta.shortcut_token;
  if (!token) {
    return NextResponse.json({ error: "No shortcut token found — reload the page and try again." }, { status: 404 });
  }
  const prepareId = storeShortcutPrepare(token);
  log.info("shortcut", `prepare created`, { prepareId: prepareId.slice(0, 8) });
  return NextResponse.json({ prepareId });
});
