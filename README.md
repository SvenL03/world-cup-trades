# World Cup Trades ⚽📈

A dark, modern dashboard to track **2026 FIFA World Cup** prediction-market trades against **live
market prices** and **live tournament standings**. Built with Next.js + Tailwind, deployable on
Vercel. See [PRD.md](./PRD.md) for the full spec.

- **Rankings** (`/`) — all 48 teams ranked, sortable/filterable spreadsheet with flags & stats.
- **Trades** (`/trades`) — your current + potential positions with projected & live P/L, W/L record,
  inline editing, and live prices from Kalshi + Polymarket.

## Quick start (local)

```bash
npm install
cp .env.example .env        # defaults work out of the box (SQLite file)
npm run db:push             # create tables in local.db
npm run seed                # load your current + potential trades
npm run dev                 # http://localhost:3000
```

Default edit password is `worldcup` (change `APP_PASSWORD` in `.env`).
Refresh live prices: open `/trades` and click **↻ Refresh prices**, or `curl localhost:3000/api/refresh-prices`.

## How it works

| Concern        | Source / mechanism |
| -------------- | ------------------ |
| Standings      | [openfootball/worldcup.json](https://github.com/openfootball/worldcup.json) (public domain) → computed in `lib/standings.ts` |
| Live prices    | Kalshi `trade-api/v2` + Polymarket Gamma API (no auth) → `lib/markets/*` |
| Storage        | Drizzle ORM on libSQL — SQLite file locally, **Turso** in production |
| Refresh        | SWR polls every 15 min while open; GitHub Actions cron hits `/api/refresh-prices` |
| Auth           | Shared-password cookie (`APP_PASSWORD`); only mutating routes are gated |

P/L math lives in one place — `lib/pl.ts`.

## Mapping a trade to live prices
Seeded trades start as `manual` (no live price). To attach a live market, **edit a trade** and set
its **Market ticker** to a discovered id (`pm:…` / `kx:…`). Browse available ids via
`GET /api/prices`. Live P/L then populates automatically on each refresh.

## Deploy to Vercel

1. **Database** — create a free [Turso](https://turso.tech) DB, then set in Vercel:
   - `TURSO_DATABASE_URL` (`libsql://…`) and `TURSO_AUTH_TOKEN`
   - Run `npm run db:push` against it once (set the same env vars locally), then `npm run seed`.
   - *Alternative:* swap to Neon/Postgres by changing the Drizzle dialect in `lib/db/index.ts`,
     `lib/db/schema.ts`, and `drizzle.config.ts`.
2. **Env vars** — also set `APP_PASSWORD`, `SESSION_SECRET`, and (optional) `REFRESH_TOKEN`.
3. **Import the repo** into Vercel and deploy.
4. **Cron** — in the GitHub repo settings → Secrets → Actions, add `APP_URL`
   (your Vercel URL) and `REFRESH_TOKEN` (if set). The workflow in
   `.github/workflows/refresh.yml` refreshes prices every 15 min for free.

## Scripts
- `npm run dev` / `build` / `start`
- `npm run db:push` — sync schema to the DB
- `npm run seed [-- --force]` — seed trades (`--force` wipes & reseeds)
- `npm run db:studio` — Drizzle Studio
