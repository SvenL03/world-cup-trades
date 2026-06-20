import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { trades } from "@/lib/db/schema";
import { getTradesWithPL } from "@/lib/trades";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!(await isAuthed()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const data = await getTradesWithPL();
  return NextResponse.json({ trades: data, fetchedAt: new Date().toISOString() });
}

const ALLOWED = new Set([
  "label", "teamCode", "teamName", "match", "side", "category",
  "isFirstHalf", "favorite", "shares", "buyPrice", "status", "tradeType",
  "myProbability", "marketSource", "marketTicker", "kickoffAt", "notes",
]);

function clean(body: Record<string, unknown>) {
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(body)) if (ALLOWED.has(k)) out[k] = body[k];
  return out;
}

export async function POST(req: NextRequest) {
  if (!(await isAuthed()))
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = clean(await req.json());
  if (!body.label) body.label = "New trade";
  const [row] = await db
    .insert(trades)
    .values(body as never)
    .returning();
  return NextResponse.json({ trade: row }, { status: 201 });
}
