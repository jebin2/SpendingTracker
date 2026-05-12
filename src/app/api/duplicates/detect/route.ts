import { NextResponse } from "next/server";
import { requireSession } from "@/server/http/requireSession";
import { requestDuplicateDetection } from "@/server/services/duplicateDetectionService";

export async function POST() {
  const result = await requireSession();
  if (!result.ok) return result.response;
  const detection = await requestDuplicateDetection(result.session);
  if ("error" in detection) return NextResponse.json(detection, { status: 500 });
  return NextResponse.json(detection);
}
