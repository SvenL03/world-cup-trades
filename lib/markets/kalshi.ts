import { isRelevant, type MarketQuote } from "./index";

const BASE = "https://api.elections.kalshi.com/trade-api/v2";

interface KalshiMarket {
  ticker: string;
  title?: string;
  yes_sub_title?: string;
  subtitle?: string;
  last_price?: number; // cents 0..100
  yes_bid?: number;
  yes_ask?: number;
  status?: string;
}

function midPrice(m: KalshiMarket): number | null {
  if (m.yes_bid != null && m.yes_ask != null && (m.yes_bid || m.yes_ask))
    return (m.yes_bid + m.yes_ask) / 2 / 100;
  if (m.last_price != null) return m.last_price / 100;
  return null;
}

/**
 * Pull open Kalshi markets and keep World-Cup-relevant ones.
 * Public market data needs no auth. Paginates a few pages.
 */
export async function fetchKalshi(): Promise<MarketQuote[]> {
  const out: MarketQuote[] = [];
  let cursor: string | undefined;
  try {
    for (let page = 0; page < 5; page++) {
      const url = new URL(`${BASE}/markets`);
      url.searchParams.set("limit", "200");
      url.searchParams.set("status", "open");
      if (cursor) url.searchParams.set("cursor", cursor);
      const res = await fetch(url, {
        headers: { accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) break;
      const data = (await res.json()) as {
        markets?: KalshiMarket[];
        cursor?: string;
      };
      for (const m of data.markets ?? []) {
        const title = [m.title, m.yes_sub_title ?? m.subtitle]
          .filter(Boolean)
          .join(" — ");
        if (!title || !isRelevant(title)) continue;
        const yes = midPrice(m);
        if (yes == null) continue;
        out.push({
          ticker: `kx:${m.ticker}`,
          source: "kalshi",
          yesPrice: Math.min(1, Math.max(0, yes)),
          title,
          url: `https://kalshi.com/markets/${m.ticker}`,
        });
      }
      cursor = data.cursor;
      if (!cursor) break;
    }
  } catch {
    /* ignore source errors */
  }
  return out;
}
