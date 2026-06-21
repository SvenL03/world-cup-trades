import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { trades } from "@/lib/db/schema";
import { canEdit } from "@/lib/auth";

export const dynamic = "force-dynamic";

const ALLOWED = new Set([
  "label", "teamCode", "teamName", "match", "side", "category",
  "isFirstHalf", "favorite", "shares", "buyPrice", "realizedPnl", "status", "tradeType",
  "myProbability", "marketSource", "marketTicker", "kickoffAt", "notes",
]);

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await canEdit()))
    return NextResponse.json({ error: "view-only" }, { status: 403 });

  const { id } = await params;
  const raw = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
  for (const k of Object.keys(raw)) if (ALLOWED.has(k)) patch[k] = raw[k];

  const [row] = await db
    .update(trades)
    .set(patch as never)
    .where(eq(trades.id, Number(id)))
    .returning();
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ trade: row });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!(await canEdit()))
    return NextResponse.json({ error: "view-only" }, { status: 403 });

  const { id } = await params;
  await db.delete(trades).where(eq(trades.id, Number(id)));
  return NextResponse.json({ ok: true });
}
