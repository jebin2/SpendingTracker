import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { requestDuplicateDetection } from "@/server/services/duplicateDetectionService";

export const POST = withSession("POST duplicates detect", async (session) => {
  const detection = await requestDuplicateDetection(session);
  if ("error" in detection) return NextResponse.json(detection, { status: 500 });
  return NextResponse.json(detection);
});
