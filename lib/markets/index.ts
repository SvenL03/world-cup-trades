export interface MarketQuote {
  ticker: string; // stable id used to map a trade -> price
  source: "kalshi" | "polymarket";
  yesPrice: number; // dollars 0..1
  title: string;
  url?: string;
}

const TEAM_TERMS = [
  "world cup", "fifa",
  "france", "croatia", "germany", "usa", "united states", "argentina",
  "spain", "england", "norway", "morocco", "ghana", "panama", "haiti",
  "senegal", "austria", "jordan", "ecuador", "ivory coast", "côte",
  "turkey", "türkiye", "australia", "brazil",
];

/** True if a market title is plausibly a World Cup / relevant-team market. */
export function isRelevant(title: string): boolean {
  const t = title.toLowerCase();
  return TEAM_TERMS.some((term) => t.includes(term));
}
