import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "./requireSession";
import { apiError } from "@/lib/api-error";
import { log } from "@/lib/logger";
import type { SheetSession } from "@/server/services/types";

export function withSession<TParams extends Record<string, string> = Record<string, string>>(
  label: string,
  handler: (session: SheetSession, req: NextRequest, params: TParams) => Promise<NextResponse>
) {
  return async (req: NextRequest, ctx: { params: Promise<TParams> }): Promise<NextResponse> => {
    const t0 = Date.now();
    const result = await requireSession();
    if (!result.ok) return result.response;
    try {
      const params = await ctx.params;
      const res = await handler(result.session, req, params);
      log.info("api", `${req.method} ${new URL(req.url).pathname}`, { status: res.status, ms: Date.now() - t0 });
      return res;
    } catch (err) {
      log.error("api", `${req.method} ${new URL(req.url).pathname}`, err, { ms: Date.now() - t0 });
      return apiError(label, err);
    }
  };
}
