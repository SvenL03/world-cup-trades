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
  favorite: boolean;
  shares: number;
  buyPrice: number; // dollars, 0..1
  realizedPnl: number | null; // actual net $ when closed (override for multi buy/sell)
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
  liveUnrealizedPL: number | null; // open trades only (null once closed)
  realizedPL: number | null; // closed trades only (override or computed settlement)
}

// ---- Standings ----
export interface TeamRow {
  code: string; // ISO-ish code used for flag (e.g. "us", "de")
  name: string;
  group: string;
  fifaRank: number; // pre-tournament FIFA ranking
  overallRank: number; // current WC rank across all teams (1 = best)
  groupRank: number; // 1..4 position within the group
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

// ---- Bracket ----
export type BracketRound =
  | "Round of 32"
  | "Round of 16"
  | "Quarter-final"
  | "Semi-final"
  | "Match for third place"
  | "Final";

export interface BracketSlot {
  /** Resolved team, or null if not yet determinable. */
  team: TeamRow | null;
  /** Raw slot label from the source (e.g. "1A", "2B", "3A/B/C/D/F", "W74"). */
  label: string;
  /** True when the team is an actual result, false when projected from standings. */
  actual: boolean;
}

export interface BracketMatch {
  num: number;
  round: BracketRound;
  date: string | null;
  home: BracketSlot;
  away: BracketSlot;
  /** Projected (or actual) winner that feeds the next round. */
  winner: BracketSlot | null;
  /** True if the winner came from a real played result. */
  decided: boolean;
}

export interface Bracket {
  rounds: { round: BracketRound; matches: BracketMatch[] }[];
}
