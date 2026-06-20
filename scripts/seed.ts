import "dotenv/config";
import { db } from "../lib/db";
import { trades } from "../lib/db/schema";
import { sql } from "drizzle-orm";
import type { NewTradeRow } from "../lib/db/schema";

type Seed = Omit<NewTradeRow, "id" | "createdAt" | "updatedAt">;

const pct = (p: number) => Math.round(p * 100);

/**
 * Current positions captured from the trade screenshots.
 * NOTE: the two rows flagged isFirstHalf are the ones that appeared twice across
 * the two screenshots — likely the FIRST-HALF-WINNER contracts, not duplicates.
 * Confirm in-app and correct buy-ins that were bought a few cents cheaper.
 */
const current: Seed[] = [
  { label: "FRA · Norway vs France", teamCode: "fr", teamName: "France", match: "Norway vs France", side: "for", category: "match", isFirstHalf: false, shares: 885, buyPrice: 0.55, status: "open", tradeType: "current", myProbability: pct(0.55), marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-26", notes: "France favored to win it all, but not 100% sure." },
  { label: "CRO · Panama vs Croatia", teamCode: "hr", teamName: "Croatia", match: "Panama vs Croatia", side: "for", category: "match", isFirstHalf: false, shares: 763, buyPrice: 0.64, status: "open", tradeType: "current", myProbability: pct(0.64), marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-23", notes: "Betting against Panama." },
  { label: "CRO · Croatia vs Ghana", teamCode: "hr", teamName: "Croatia", match: "Croatia vs Ghana", side: "for", category: "match", isFirstHalf: false, shares: 800, buyPrice: 0.62, status: "open", tradeType: "current", myProbability: pct(0.62), marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-27", notes: "Betting against Ghana." },
  { label: "USA · Türkiye vs USA", teamCode: "us", teamName: "USA", match: "Türkiye vs USA", side: "for", category: "match", isFirstHalf: false, shares: 2612, buyPrice: 0.42, status: "open", tradeType: "current", myProbability: pct(0.42), marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-25", notes: "USA doing really well in Group D." },
  { label: "GER · Germany vs Côte d'Ivoire", teamCode: "de", teamName: "Germany", match: "Germany vs Côte d'Ivoire", side: "for", category: "match", isFirstHalf: false, shares: 1504, buyPrice: 0.66, status: "open", tradeType: "current", myProbability: pct(0.66), marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-20", notes: "Easy group, Germany should win out." },
  { label: "GER · Ecuador vs Germany", teamCode: "de", teamName: "Germany", match: "Ecuador vs Germany", side: "for", category: "match", isFirstHalf: false, shares: 1008, buyPrice: 0.58, status: "open", tradeType: "current", myProbability: pct(0.58), marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-25", notes: null },
  { label: "ARG · Argentina vs Australia", teamCode: "ar", teamName: "Argentina", match: "Argentina vs Australia", side: "for", category: "match", isFirstHalf: false, shares: 155, buyPrice: 0.63, status: "open", tradeType: "current", myProbability: pct(0.63), marketSource: "manual", marketTicker: null, kickoffAt: null, notes: null },
  { label: "GER · Ecuador vs Germany (1st half)", teamCode: "de", teamName: "Germany", match: "Ecuador vs Germany", side: "for", category: "first_half", isFirstHalf: true, shares: 706, buyPrice: 0.41, status: "open", tradeType: "current", myProbability: pct(0.41), marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-25", notes: "First-half winner contract (confirm)." },
  { label: "GER · Germany vs Côte d'Ivoire (1st half)", teamCode: "de", teamName: "Germany", match: "Germany vs Côte d'Ivoire", side: "for", category: "first_half", isFirstHalf: true, shares: 154, buyPrice: 0.48, status: "open", tradeType: "current", myProbability: pct(0.48), marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-20", notes: "First-half winner contract (confirm)." },
  { label: "GER · World Cup Winner", teamCode: "de", teamName: "Germany", match: null, side: "for", category: "tournament_winner", isFirstHalf: false, shares: 15, buyPrice: 0.11, status: "open", tradeType: "current", myProbability: pct(0.11), marketSource: "manual", marketTicker: null, kickoffAt: null, notes: "Small futures position." },
  { label: "ESP · World Cup Winner", teamCode: "es", teamName: "Spain", match: null, side: "for", category: "tournament_winner", isFirstHalf: false, shares: 10, buyPrice: 0.15, status: "open", tradeType: "current", myProbability: pct(0.15), marketSource: "manual", marketTicker: null, kickoffAt: null, notes: "Small futures position." },
  { label: "ARG · World Cup Winner", teamCode: "ar", teamName: "Argentina", match: null, side: "for", category: "tournament_winner", isFirstHalf: false, shares: 18, buyPrice: 0.14, status: "open", tradeType: "current", myProbability: pct(0.14), marketSource: "manual", marketTicker: null, kickoffAt: null, notes: "Small futures position." },
  { label: "USA · Group D Winner", teamCode: "us", teamName: "USA", match: null, side: "for", category: "group_winner", isFirstHalf: false, shares: 14, buyPrice: 0.87, status: "open", tradeType: "current", myProbability: pct(0.87), marketSource: "manual", marketTicker: null, kickoffAt: null, notes: null },
  { label: "GER · Group E Winner", teamCode: "de", teamName: "Germany", match: null, side: "for", category: "group_winner", isFirstHalf: false, shares: 14, buyPrice: 0.76, status: "open", tradeType: "current", myProbability: pct(0.76), marketSource: "manual", marketTicker: null, kickoffAt: null, notes: null },
];

/** Suggested future bets (watchlist) — shares/buy price filled when you enter. */
const potential: Seed[] = [
  { label: "ENG · England vs Ghana", teamCode: "gb-eng", teamName: "England", match: "England vs Ghana", side: "for", category: "match", isFirstHalf: false, shares: 0, buyPrice: 0, status: "open", tradeType: "potential", myProbability: null, marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-23", notes: "Against Ghana." },
  { label: "ENG · Panama vs England", teamCode: "gb-eng", teamName: "England", match: "Panama vs England", side: "for", category: "match", isFirstHalf: false, shares: 0, buyPrice: 0, status: "open", tradeType: "potential", myProbability: null, marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-27", notes: "Against Panama." },
  { label: "NOR · Norway vs Senegal", teamCode: "no", teamName: "Norway", match: "Norway vs Senegal", side: "for", category: "match", isFirstHalf: false, shares: 0, buyPrice: 0, status: "open", tradeType: "potential", myProbability: null, marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-22", notes: "Considering Norway." },
  { label: "ARG · Argentina vs Austria", teamCode: "ar", teamName: "Argentina", match: "Argentina vs Austria", side: "for", category: "match", isFirstHalf: false, shares: 0, buyPrice: 0, status: "open", tradeType: "potential", myProbability: null, marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-22", notes: null },
  { label: "ARG · Jordan vs Argentina", teamCode: "ar", teamName: "Argentina", match: "Jordan vs Argentina", side: "for", category: "match", isFirstHalf: false, shares: 0, buyPrice: 0, status: "open", tradeType: "potential", myProbability: null, marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-27", notes: null },
  { label: "MAR · Morocco vs Haiti", teamCode: "ma", teamName: "Morocco", match: "Morocco vs Haiti", side: "for", category: "match", isFirstHalf: false, shares: 0, buyPrice: 0, status: "open", tradeType: "potential", myProbability: null, marketSource: "manual", marketTicker: null, kickoffAt: "2026-06-24", notes: "Against Haiti." },
];

async function main() {
  const force = process.argv.includes("--force");
  const [{ n }] = await db.select({ n: sql<number>`count(*)` }).from(trades);
  if (n > 0 && !force) {
    console.log(`trades table already has ${n} rows — skipping. Use --force to wipe & reseed.`);
    return;
  }
  if (force) await db.delete(trades);

  const rows = [...current, ...potential];
  await db.insert(trades).values(rows);
  console.log(`Seeded ${current.length} current + ${potential.length} potential = ${rows.length} trades.`);
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e);
  process.exit(1);
});
