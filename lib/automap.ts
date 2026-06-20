import { db } from "./db";
import { priceSnapshots, trades } from "./db/schema";
import { desc, eq } from "drizzle-orm";

/**
 * Best-effort: attach each trade to a live Polymarket ticker from the latest
 * snapshots, by category. As future match markets go live they get picked up.
 * Only fills EMPTY mappings unless `force` is true.
 */

// teamName -> { winner slug in `will-<slug>-win-the-2026-fifa-world-cup`,
//               3-letter code in `fifwc-<home>-<away>-<date>-<code>` }
const TEAM: Record<string, { slug: string; code: string }> = {
  France: { slug: "france", code: "fra" },
  Croatia: { slug: "croatia", code: "cro" },
  Germany: { slug: "germany", code: "ger" },
  USA: { slug: "usa", code: "usa" },
  Argentina: { slug: "argentina", code: "arg" },
  Spain: { slug: "spain", code: "esp" },
  England: { slug: "england", code: "eng" },
  Norway: { slug: "norway", code: "nor" },
  Morocco: { slug: "morocco", code: "mar" },
};

// Codes for parsing the opponent out of a "A vs B" match string.
const CODE: Record<string, string> = {
  France: "fra", Norway: "nor", Panama: "pan", Croatia: "cro", Ghana: "gha",
  USA: "usa", "Türkiye": "tur", Turkey: "tur", Germany: "ger",
  "Côte d'Ivoire": "civ", "Ivory Coast": "civ", Ecuador: "ecu",
  Argentina: "arg", Australia: "aus", Austria: "aut", Jordan: "jor",
  England: "eng", Senegal: "sen", Morocco: "mar", Haiti: "hai", Spain: "esp",
};

const codeOf = (name: string): string | null => CODE[name.trim()] ?? null;

export interface AutoMapResult {
  mapped: number;
  total: number;
  details: { label: string; ticker: string | null }[];
}

export async function autoMapTrades(force = false): Promise<AutoMapResult> {
  const snaps = await db
    .select()
    .from(priceSnapshots)
    .orderBy(desc(priceSnapshots.capturedAt));
  const list = [...new Set(snaps.map((s) => s.marketTicker))];

  const rows = await db.select().from(trades);
  const details: AutoMapResult["details"] = [];
  let mapped = 0;

  for (const t of rows) {
    if (t.marketTicker && !force) {
      details.push({ label: t.label, ticker: t.marketTicker });
      continue;
    }
    let found: string | null = null;

    if (t.category === "tournament_winner" && t.teamName && TEAM[t.teamName]) {
      const slug = TEAM[t.teamName].slug;
      found = list.find((x) => x.includes(`will-${slug}-win-the-2026-fifa-world-cup`)) ?? null;
    } else if (t.category === "group_winner" && t.teamName && TEAM[t.teamName]) {
      const slug = TEAM[t.teamName].slug;
      found = list.find((x) => x.includes(`will-${slug}-win-group-`)) ?? null;
    } else if (t.category === "match" && t.match && t.teamName && TEAM[t.teamName]) {
      const my = TEAM[t.teamName].code;
      const sides = t.match.split(/\s+vs\.?\s+/i).map((s) => codeOf(s));
      const oppC = sides.find((c) => c && c !== my);
      found =
        list.find(
          (x) =>
            x.startsWith("pm:fifwc-") &&
            x.endsWith(`-${my}`) &&
            (!oppC || x.includes(oppC)),
        ) ?? null;
    }
    // first_half / total_goals: no reliable public market -> leave manual

    if (found) {
      await db
        .update(trades)
        .set({ marketTicker: found, marketSource: "polymarket" })
        .where(eq(trades.id, t.id));
      mapped++;
    }
    details.push({ label: t.label, ticker: found });
  }

  return { mapped, total: rows.length, details };
}
