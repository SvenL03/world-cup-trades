import { NextRequest, NextResponse } from "next/server";
import { autoMapTrades } from "@/lib/automap";
import { canEdit } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Map unmapped trades to live markets. ?force=1 re-maps everything. */
export async function POST(req: NextRequest) {
  if (!(await canEdit()))
    return NextResponse.json({ error: "view-only" }, { status: 403 });

  const force = new URL(req.url).searchParams.get("force") === "1";
  const result = await autoMapTrades(force);
  return NextResponse.json(result);
}
