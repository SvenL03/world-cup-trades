# World Cup Trades Dashboard — PRD

## 1. Goal
A personal, deployed web app to track 2026 FIFA World Cup prediction-market trades against live
market prices and live tournament standings.

## 2. Users
Single primary user (the trader). Viewing is public; adding/editing/deleting trades is gated by a
shared password.

## 3. Core features

### Page 1 — Rankings (`/`)
- All 48 group-stage teams across 12 groups in a spreadsheet-style table.
- Columns: flag, team, group, Played, W, D, L, GF, GA, **GD**, **Pts**, Win%, Goals/Game,
  Clean Sheets, and recent **Form**.
- Every column is sortable; global search + per-group filter chips; top-2-per-group highlighted.
- Dark theme with electric-blue glow edges and German black/red/gold accents; flags from flagcdn.com.

### Page 2 — Trades (`/trades`)
- Summary header: total cost (at risk), payout if all win, **projected profit**, **live unrealized
  P/L** (+ live value), and a **W / O / L record** with realized P/L on settled trades.
- Table of positions: team (flag) + match, side (FOR/AGAINST), category, shares, buy price, **live
  price**, projected profit, live P/L, my-probability, status — all sortable.
- Filters: bucket (Current / Potential / All), side (For / Against), status, free-text search.
- Add / edit / delete trades via a modal (gated by login). First-half-winner contracts are flagged.
- Prices auto-refresh every 15 min while the page is open; manual "Refresh prices" button.

## 4. Data sources
- **Standings**: openfootball `worldcup.json` (public domain, no key). Group tables + extra stats
  are computed from match results in `lib/standings.ts`.
- **Prices**: Kalshi (`api.elections.kalshi.com/trade-api/v2`, no auth) + Polymarket Gamma API
  (`gamma-api.polymarket.com`, no auth). Each trade optionally maps to a `marketTicker`
  (`kx:…` / `pm:…`); unmapped trades stay manual (no live price until mapped).
- **Note**: Robinhood / Rothera expose no public price API. Kalshi + Polymarket track the same
  World Cup markets closely; exact Robinhood fills are entered/edited by the user.

## 5. Refresh / freshness
- Client revalidates every 15 min (SWR `refreshInterval`); a "Prices as of …" timestamp is shown.
- `GET|POST /api/refresh-prices` snapshots latest prices to the DB. Called by a GitHub Actions cron
  (`.github/workflows/refresh.yml`, every 15 min — free) and by the manual button. Optionally gated
  by `REFRESH_TOKEN`.

## 6. P/L formulas (single source of truth — `lib/pl.ts`)
- `cost = shares × buy_price`
- `payout_if_win = shares × $1.00`
- `projected_profit = payout_if_win − cost`
- `live_value = shares × live_price`
- `live_unrealized_pl = shares × (live_price − buy_price)`
- Realized P/L: won → `+projected_profit`; lost → `−cost`.

## 7. Tech
Next.js (App Router) + TypeScript, Tailwind v4, TanStack Table, SWR, Drizzle ORM on libSQL/Turso
(SQLite file locally), deployed on Vercel.

## 8. Non-goals (v1)
- No placing real trades / no Robinhood account integration.
- No multi-user accounts (single shared password only).
- No automatic mutual-exclusivity detection (e.g. only one tournament-winner can hit) — surfaced as
  notes only.

## 9. Success criteria
- Deployed on Vercel; both pages load; standings reflect latest played matches.
- The 14 current positions + suggested future bets are pre-seeded and editable.
- Prices refresh without redeploy; P/L matches §6 (e.g. USA 2612@.42 → cost $1,097.04, profit
  $1,514.96 — verified).

## 10. Open items (post-build, non-blocking)
- Confirm which positions are first-half-winner contracts and correct any cheaper buy-ins.
- Map each trade to a Kalshi/Polymarket `marketTicker` for live pricing.
