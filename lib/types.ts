export type Side = "for" | "against";
export type TradeStatus = "open" | "won" | "lost";
export type TradeType = "current" | "potential";
export type MarketSource = "kalshi" | "polymarket" | "manual";
export type TradeCategory =
  | "match"
  | "group_winner"
  | "tournament_winner"
  | "first_half"
  | "total_goals";

export interface Trade {
  id: number;
  label: string;
  teamCode: string | null;
  teamName: string | null;
  match: string | null;
  side: Side;
  category: TradeCategory;
  isFirstHalf: boolean;
  shares: number;
  buyPrice: number; // dollars, 0..1
  status: TradeStatus;
  tradeType: TradeType;
  myProbability: number | null; // 0..100
  marketSource: MarketSource;
  marketTicker: string | null;
  kickoffAt: string | null; // ISO
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export type NewTrade = Omit<Trade, "id" | "createdAt" | "updatedAt">;

export interface PriceSnapshot {
  marketTicker: string;
  source: MarketSource;
  yesPrice: number; // dollars 0..1
  capturedAt: string;
}

/** A trade with the live price + derived P/L attached. */
export interface TradeWithPL extends Trade {
  livePrice: number | null;
  priceCapturedAt: string | null;
  cost: number;
  payoutIfWin: number;
  projectedProfit: number;
  liveValue: number | null;
  liveUnrealizedPL: number | null;
}

// ---- Standings ----
export interface TeamRow {
  code: string; // ISO-ish code used for flag (e.g. "us", "de")
  name: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDiff: number;
  points: number;
  cleanSheets: number;
  form: ("W" | "D" | "L")[]; // most recent last
  goalsPerGame: number;
  winPct: number;
}
