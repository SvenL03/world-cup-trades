import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { priceSnapshots } from "@/lib/db/schema";
import { fetchPolymarket } from "@/lib/markets/polymarket";
import { fetchKalshi } from "@/lib/markets/kalshi";
import { isAuthed } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Snapshot current World-Cup-relevant prices from Kalshi + Polymarket.
 * Authorized either by a logged-in session (the Trades page auto-refreshes) or,
 * for the GitHub Actions cron, by the REFRESH_TOKEN via ?token= / Bearer header.
 */
async function refresh(req: NextRequest) {
  const required = process.env.REFRESH_TOKEN;
  if (required) {
    const url = new URL(req.url);
    const token =
      url.searchParams.get("token") ??
      req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (token !== required && !(await isAuthed()))
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const [pm, kx] = await Promise.all([fetchPolymarket(), fetchKalshi()]);
  const quotes = [...pm, ...kx];

  if (quotes.length) {
    const now = new Date().toISOString();
    await db.insert(priceSnapshots).values(
      quotes.map((q) => ({
        marketTicker: q.ticker,
        source: q.source,
        yesPrice: q.yesPrice,
        capturedAt: now,
      })),
    );
  }

  return NextResponse.json({
    ok: true,
    captured: quotes.length,
    polymarket: pm.length,
    kalshi: kx.length,
    at: new Date().toISOString(),
  });
}

export const GET = refresh;
export const POST = refresh;
