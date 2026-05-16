import { NextResponse } from "next/server";
import { withSession } from "@/server/http/withSession";
import { parseReceiptImage } from "@/lib/ai/parse-image";
import { todayISO } from "@/lib/date/iso";

const VALID_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
type ValidMediaType = typeof VALID_TYPES[number];

export const POST = withSession("POST parse image", async (_session, req) => {
  const formData = await req.formData();
  const image = formData.get("image") as File | null;
  const region = formData.get("region") as string | null;
  if (!image) return NextResponse.json({ error: "image is required" }, { status: 400 });
  if (!VALID_TYPES.includes(image.type as ValidMediaType)) {
    return NextResponse.json({ error: "Only JPEG, PNG, WebP supported" }, { status: 400 });
  }
  const base64 = Buffer.from(await image.arrayBuffer()).toString("base64");
  const extracted = await parseReceiptImage(base64, image.type as ValidMediaType, region ?? undefined, todayISO());
  return NextResponse.json({ extracted, confidence: extracted.confidence });
});
