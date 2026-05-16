import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { requestItemNormalization } from "@/server/services/itemNormalizationService";

export const POST = withSession("POST items normalize", async (session) => {
  return NextResponse.json(await requestItemNormalization(session));
});
