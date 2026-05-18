import { generateWithImage } from "./client";
import { parseAiJson } from "./parseJson";
import { SYSTEM_PROMPT } from "./parse-text";
import type { ParsedTransaction } from "@/types";
import { todayISO } from "@/lib/date/iso";

export async function parseReceiptImage(
  imageBase64: string,
  mediaType: "image/jpeg" | "image/png" | "image/webp",
  userRegion?: string,
  todayDate?: string
): Promise<ParsedTransaction> {
  const userContext = [
    userRegion ? `User is in ${userRegion}.` : "",
    todayDate ? `Today's date is ${todayDate}.` : `Today's date is ${todayISO()}.`,
  ].filter(Boolean).join(" ");

  const raw = await generateWithImage(
    imageBase64,
    mediaType,
    `${userContext}\n\nParse this receipt and extract every line item.`,
    SYSTEM_PROMPT,
    2048
  );

  return parseAiJson<ParsedTransaction>(raw);
}
