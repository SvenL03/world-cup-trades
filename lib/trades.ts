import { db } from "./db";
import { priceSnapshots, trades as tradesTable } from "./db/schema";
import type { TradeRow } from "./db/schema";
import { desc } from "drizzle-orm";
import { withPL } from "./pl";
import type {
  PriceSnapshot,
  Trade,
  TradeCategory,
  TradeWithPL,
  MarketSource,
  Side,
  TradeStatus,
  TradeType,
} from "./types";

function toTrade(r: TradeRow): Trade {
  return {
    id: r.id,
    label: r.label,
    teamCode: r.teamCode,
    teamName: r.teamName,
    match: r.match,
    side: r.side as Side,
    category: r.category as TradeCategory,
    isFirstHalf: r.isFirstHalf,
    favorite: r.favorite,
    shares: r.shares,
    buyPrice: r.buyPrice,
    status: r.status as TradeStatus,
    tradeType: r.tradeType as TradeType,
    myProbability: r.myProbability ?? null,
    marketSource: r.marketSource as MarketSource,
    marketTicker: r.marketTicker,
    kickoffAt: r.kickoffAt,
    notes: r.notes,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  };
}

/** Latest price snapshot per market ticker. */
async function latestPrices(): Promise<Map<string, PriceSnapshot>> {
  const rows = await db
    .select()
    .from(priceSnapshots)
    .orderBy(desc(priceSnapshots.capturedAt));
  const map = new Map<string, PriceSnapshot>();
  for (const r of rows) {
    if (!map.has(r.marketTicker)) {
      map.set(r.marketTicker, {
        marketTicker: r.marketTicker,
        source: r.source as MarketSource,
        yesPrice: r.yesPrice,
        capturedAt: r.capturedAt,
      });
    }
  }
  return map;
}

export async function getTradesWithPL(): Promise<TradeWithPL[]> {
  const [rows, prices] = await Promise.all([
    db.select().from(tradesTable).orderBy(desc(tradesTable.id)),
    latestPrices(),
  ]);
  return rows.map((r) => {
    const t = toTrade(r);
    const snap = t.marketTicker ? prices.get(t.marketTicker) : null;
    return withPL(t, snap);
  });
}
