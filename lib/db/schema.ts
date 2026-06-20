import { sql } from "drizzle-orm";
import {
  integer,
  real,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const trades = sqliteTable("trades", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  label: text("label").notNull(),
  teamCode: text("team_code"),
  teamName: text("team_name"),
  match: text("match"),
  side: text("side").notNull().default("for"), // 'for' | 'against'
  category: text("category").notNull().default("match"),
  isFirstHalf: integer("is_first_half", { mode: "boolean" })
    .notNull()
    .default(false),
  favorite: integer("favorite", { mode: "boolean" }).notNull().default(false),
  shares: integer("shares").notNull().default(0),
  buyPrice: real("buy_price").notNull().default(0), // dollars 0..1
  status: text("status").notNull().default("open"), // 'open' | 'won' | 'lost'
  tradeType: text("trade_type").notNull().default("current"), // 'current' | 'potential'
  myProbability: integer("my_probability"), // 0..100
  marketSource: text("market_source").notNull().default("manual"),
  marketTicker: text("market_ticker"),
  kickoffAt: text("kickoff_at"), // ISO string
  notes: text("notes"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(current_timestamp)`),
  updatedAt: text("updated_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export const priceSnapshots = sqliteTable("price_snapshots", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  marketTicker: text("market_ticker").notNull(),
  source: text("source").notNull(), // 'kalshi' | 'polymarket'
  yesPrice: real("yes_price").notNull(), // dollars 0..1
  capturedAt: text("captured_at")
    .notNull()
    .default(sql`(current_timestamp)`),
});

export type TradeRow = typeof trades.$inferSelect;
export type NewTradeRow = typeof trades.$inferInsert;
