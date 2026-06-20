import { isRelevant, type MarketQuote } from "./index";

const GAMMA = "https://gamma-api.polymarket.com";

interface GammaMarket {
  id?: string;
  slug?: string;
  question?: string;
  closed?: boolean;
  active?: boolean;
  outcomes?: string | string[];
  outcomePrices?: string | string[];
}

function parseArr(v: string | string[] | undefined): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v;
  try {
    return JSON.parse(v) as string[];
  } catch {
    return [];
  }
}

/**
 * Pull active Polymarket markets and keep World-Cup-relevant ones.
 * Uses the "Yes" outcome price (binary markets) as yesPrice.
 */
export async function fetchPolymarket(): Promise<MarketQuote[]> {
  const out: MarketQuote[] = [];
  try {
    const res = await fetch(
      `${GAMMA}/markets?closed=false&active=true&limit=200&order=volume24hr&ascending=false`,
      { headers: { accept: "application/json" }, cache: "no-store" },
    );
    if (!res.ok) return out;
    const markets = (await res.json()) as GammaMarket[];
    for (const m of markets) {
      const q = m.question ?? "";
      if (!q || !isRelevant(q)) continue;
      const outcomes = parseArr(m.outcomes).map((s) => s.toLowerCase());
      const prices = parseArr(m.outcomePrices).map(Number);
      let yes = NaN;
      const yi = outcomes.findIndex((o) => o === "yes");
      if (yi >= 0 && prices[yi] != null) yes = prices[yi];
      else if (prices.length) yes = prices[0];
      if (!Number.isFinite(yes)) continue;
      out.push({
        ticker: `pm:${m.slug ?? m.id}`,
        source: "polymarket",
        yesPrice: Math.min(1, Math.max(0, yes)),
        title: q,
        url: m.slug ? `https://polymarket.com/event/${m.slug}` : undefined,
      });
    }
  } catch {
    /* network/source error -> return what we have */
  }
  return out;
}
