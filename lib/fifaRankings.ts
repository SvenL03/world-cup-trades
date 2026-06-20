/**
 * Pre-tournament FIFA Men's World Ranking (snapshot: June 11, 2026 release).
 * Keyed by the openfootball team names used elsewhere in the app.
 * Top-50 values are from the official June 2026 ranking; teams ranked beyond
 * the published top 50 use approximate real-world positions.
 * Source: FIFA / ESPN June 2026 ranking.
 */
export const FIFA_RANK: Record<string, number> = {
  Spain: 1,
  Argentina: 2,
  France: 3,
  England: 4,
  Brazil: 5,
  Portugal: 6,
  Netherlands: 7,
  Belgium: 8,
  Germany: 9,
  Croatia: 10,
  Morocco: 11,
  Colombia: 13,
  USA: 14,
  Mexico: 15,
  Uruguay: 16,
  Switzerland: 17,
  Japan: 18,
  Senegal: 19,
  Iran: 20,
  "South Korea": 22,
  Ecuador: 23,
  Austria: 24,
  Turkey: 25,
  Australia: 26,
  Canada: 27,
  Norway: 29,
  Panama: 30,
  Algeria: 34,
  Egypt: 35,
  Scotland: 36,
  Paraguay: 39,
  Tunisia: 41,
  "Ivory Coast": 42,
  Sweden: 43,
  "Czech Republic": 44,
  Uzbekistan: 50,
  // Beyond the published top 50 — approximate real-world positions:
  Qatar: 52,
  "DR Congo": 57,
  Iraq: 58,
  "Saudi Arabia": 60,
  "South Africa": 62,
  Jordan: 64,
  "Cape Verde": 70,
  Ghana: 73,
  "Bosnia & Herzegovina": 74,
  "Curaçao": 82,
  Haiti: 86,
  "New Zealand": 89,
};

/** FIFA rank for a team, or a large fallback so unknowns sort last. */
export function fifaRank(teamName: string): number {
  return FIFA_RANK[teamName] ?? 999;
}
