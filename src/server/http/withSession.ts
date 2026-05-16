import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "./requireSession";
import { apiError } from "@/lib/api-error";
import type { SheetSession } from "@/server/services/types";

export function withSession<TParams extends Record<string, string> = Record<string, string>>(
  label: string,
  handler: (session: SheetSession, req: NextRequest, params: TParams) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Promise<TParams> }): Promise<NextResponse> => {
    const result = await requireSession();
    if (!result.ok) return result.response;
    try {
      const params = await ctx.params;
      return await handler(result.session, req, params);
    } catch (err) {
      return apiError(label, err);
    }
  };
}
