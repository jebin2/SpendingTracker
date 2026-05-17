import { NextRequest, NextResponse } from "next/server";
import { buildBplist } from "@/lib/bplist";
import { getShortcutPrepare } from "@/lib/shortcutPrepare";
import { log } from "@/lib/logger";

// Builds the Shortcuts plist structure for a "Log to FundsFlee" share extension shortcut.
// The shortcut receives shared text, POSTs it to /api/shortcut with the user's token,
// and shows the parsed result as a Shortcuts notification.
function buildShortcutPlist(token: string, origin: string) {
  const apiUrl = `${origin}/api/shortcut`;
  return {
    WFWorkflowActions: [
      {
        WFWorkflowActionIdentifier: "is.workflow.actions.downloadurl",
        WFWorkflowActionParameters: {
          WFHTTPMethod:   "POST",
          ShowHeaders:    false,
          WFURL:          apiUrl,
          WFHTTPBodyType: "JSON",
          WFHTTPHeaders: {
            Value: {
              WFDictionaryFieldValueItems: [
                {
                  WFItemType: 0,
                  WFKey:   { Value: { string: "Authorization" },    WFSerializationType: "WFTextTokenString" },
                  WFValue: { Value: { string: `Bearer ${token}` }, WFSerializationType: "WFTextTokenString" },
                },
              ],
            },
            WFSerializationType: "WFDictionaryFieldValue",
          },
          WFHTTPBodyValues: {
            Value: {
              WFDictionaryFieldValueItems: [
                {
                  WFItemType: 0,
                  WFKey: { Value: { string: "text" }, WFSerializationType: "WFTextTokenString" },
                  // ￼ is the Unicode Object Replacement Character used by Shortcuts as
                  // an attachment placeholder; attachmentsByRange maps the range to the source.
                  WFValue: {
                    Value: {
                      attachmentsByRange: { "{0, 1}": { Type: "ExtensionInput" } },
                      string: "￼",
                    },
                    WFSerializationType: "WFTextTokenString",
                  },
                },
                {
                  WFItemType: 0,
                  WFKey:   { Value: { string: "source" }, WFSerializationType: "WFTextTokenString" },
                  WFValue: { Value: { string: "shortcut" }, WFSerializationType: "WFTextTokenString" },
                },
              ],
            },
            WFSerializationType: "WFDictionaryFieldValue",
          },
        },
      },
    ],
    WFWorkflowClientVersion:              "1300.0.0",
    WFWorkflowHasShortcutInputVariables:  false,
    WFWorkflowIcon: {
      WFWorkflowIconGlyphNumber: 59511,   // SF Symbol glyph
      WFWorkflowIconStartColor:  286527743, // indigo (fits in signed int32)
    },
    WFWorkflowImportQuestions:          [],
    WFWorkflowInputContentItemClasses:  ["WFStringContentItem"],
    WFWorkflowMinimumClientVersion:      900,
    WFWorkflowMinimumClientVersionString: "900",
    WFWorkflowName:                      "Log to FundsFlee",
    WFWorkflowOutputContentItemClasses:  [],
    WFWorkflowTypes:                     ["ActionExtension"],
  };
}

// GET /api/shortcut/file?id=<prepareId>
// Looks up the shortcut JWT by the short prepare ID (stored in memory by
// POST /api/shortcut/prepare) and returns a binary .shortcut file with the
// token already embedded. Using a UUID instead of the full JWT keeps the
// URL short enough for the shortcuts:// URL scheme to handle.
export async function GET(req: NextRequest) {
  const prepareId = req.nextUrl.searchParams.get("id");
  log.info("shortcut", `file download request`, { prepareId: prepareId?.slice(0, 8) ?? "none" });

  if (!prepareId) {
    return NextResponse.json({ error: "id required" }, { status: 400 });
  }

  const token = getShortcutPrepare(prepareId);
  if (!token) {
    log.warn("shortcut", `prepare id not found or expired`, { prepareId: prepareId.slice(0, 8) });
    return NextResponse.json({ error: "Invalid or expired install link — tap Install Shortcut again." }, { status: 401 });
  }

  log.info("shortcut", `building shortcut file`);
  const origin = `${req.nextUrl.protocol}//${req.nextUrl.host}`;
  const plist  = buildShortcutPlist(token, origin);
  const buf    = buildBplist(plist);

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type":        "application/x-apple-shortcut",
      "Content-Disposition": 'attachment; filename="FundsFlee.shortcut"',
      "Content-Length":      String(buf.length),
      // Don't cache — token may be rotated
      "Cache-Control":       "no-store",
    },
  });
}
