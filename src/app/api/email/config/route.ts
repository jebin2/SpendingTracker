import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { getEmailImportStatus, saveEmailImportConfig } from "@/server/services/emailImportService";

export const GET = withSession("GET email config", async (session) => {
  const status = await getEmailImportStatus(session);
  return NextResponse.json(status);
});

export const PUT = withSession("PUT email config", async (session, req) => {
  const body = await req.json() as {
    enabled?: boolean;
    fromContains?: string[];
    daysBack?: number;
  };

  // Validate: if enabling, at least one fromContains entry is required
  if (body.enabled && body.fromContains !== undefined && body.fromContains.length === 0) {
    return NextResponse.json(
      { error: "At least one 'from contains' filter is required to enable email import." },
      { status: 400 }
    );
  }

  await saveEmailImportConfig(session, body);
  return NextResponse.json({ ok: true });
});
