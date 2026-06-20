import { NextResponse } from "next/server";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { priceSnapshots } from "@/lib/db/schema";

export const dynamic = "force-dynamic";

/** Latest snapshot per ticker — used to map a trade -> a live market. */
export async function GET() {
  const rows = await db
    .select()
    .from(priceSnapshots)
    .orderBy(desc(priceSnapshots.capturedAt))
    .limit(2000);

  const latest = new Map<string, (typeof rows)[number]>();
  for (const r of rows) if (!latest.has(r.marketTicker)) latest.set(r.marketTicker, r);

  return NextResponse.json({
    quotes: [...latest.values()],
    updatedAt: rows[0]?.capturedAt ?? null,
  });
}
