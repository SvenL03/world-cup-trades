import type { Trade, TradeWithPL, PriceSnapshot } from "./types";

/**
 * Single source of truth for P/L math (PRD §8).
 *   cost              = shares × buy_price
 *   payout_if_win     = shares × $1.00
 *   projected_profit  = payout_if_win − cost
 *   live_value        = shares × live_price
 *   live_unrealized   = shares × (live_price − buy_price)
 */
export function withPL(
  trade: Trade,
  snapshot?: PriceSnapshot | null,
): TradeWithPL {
  const cost = trade.shares * trade.buyPrice;
  const payoutIfWin = trade.shares * 1;
  const projectedProfit = payoutIfWin - cost;
  const closed = trade.status === "won" || trade.status === "lost";

  const livePrice = snapshot ? snapshot.yesPrice : null;
  // Once closed, there is no unrealized P/L — it's settled.
  const liveValue = closed || livePrice == null ? null : trade.shares * livePrice;
  const liveUnrealizedPL =
    closed || livePrice == null ? null : trade.shares * (livePrice - trade.buyPrice);

  // Realized: prefer the user's actual-P/L override, else the binary settlement.
  let realizedPL: number | null = null;
  if (closed) {
    realizedPL =
      trade.realizedPnl != null
        ? trade.realizedPnl
        : trade.status === "won"
          ? projectedProfit // shares × ($1 − buy)
          : -cost; // lose the stake
  }

  return {
    ...trade,
    livePrice,
    priceCapturedAt: snapshot ? snapshot.capturedAt : null,
    cost,
    payoutIfWin,
    projectedProfit,
    liveValue,
    liveUnrealizedPL,
    realizedPL,
  };
}

export interface PortfolioTotals {
  count: number;
  totalCost: number;
  totalPayout: number;
  totalProjectedProfit: number;
  totalLiveValue: number;
  totalLiveUnrealizedPL: number;
  won: number;
  open: number;
  lost: number;
  realizedPL: number; // settled won/lost outcomes
}

/** Aggregate totals for a set of trades (typically filtered to one tradeType). */
export function totals(trades: TradeWithPL[]): PortfolioTotals {
  const t: PortfolioTotals = {
    count: trades.length,
    totalCost: 0,
    totalPayout: 0,
    totalProjectedProfit: 0,
    totalLiveValue: 0,
    totalLiveUnrealizedPL: 0,
    won: 0,
    open: 0,
    lost: 0,
    realizedPL: 0,
  };

  for (const tr of trades) {
    if (tr.status === "won" || tr.status === "lost") {
      // Settled: counts toward realized only, never at-risk / unrealized.
      if (tr.status === "won") t.won += 1;
      else t.lost += 1;
      if (tr.realizedPL != null) t.realizedPL += tr.realizedPL;
    } else {
      // Open: at-risk cost, projections, and unrealized P/L.
      t.open += 1;
      t.totalCost += tr.cost;
      t.totalPayout += tr.payoutIfWin;
      t.totalProjectedProfit += tr.projectedProfit;
      if (tr.liveValue != null) t.totalLiveValue += tr.liveValue;
      if (tr.liveUnrealizedPL != null) t.totalLiveUnrealizedPL += tr.liveUnrealizedPL;
    }
  }
  return t;
}

export const usd = (n: number | null | undefined): string =>
  n == null
    ? "—"
    : (n < 0 ? "-$" : "$") +
      Math.abs(n).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

export const cents = (price: number | null | undefined): string =>
  price == null ? "—" : `${Math.round(price * 100)}¢`;
