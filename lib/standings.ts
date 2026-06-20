import { flagCode, isRealTeam } from "./countries";
import type { TeamRow } from "./types";

const SOURCE_URL =
  "https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json";

interface RawMatch {
  round?: string;
  date?: string;
  time?: string;
  team1: string;
  team2: string;
  group?: string;
  score?: { ft?: [number, number]; ht?: [number, number] };
}

interface RawData {
  name: string;
  matches: RawMatch[];
}

interface Acc {
  code: string;
  name: string;
  group: string;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  gf: number;
  ga: number;
  cleanSheets: number;
  form: ("W" | "D" | "L")[];
}

export interface StandingsResult {
  groups: { group: string; teams: TeamRow[] }[];
  all: TeamRow[];
  matchesPlayed: number;
  source: string;
  fetchedAt: string;
}

/** Fetch the public-domain dataset and compute group tables + extra stats. */
export async function getStandings(): Promise<StandingsResult> {
  const res = await fetch(SOURCE_URL, { next: { revalidate: 600 } });
  if (!res.ok) throw new Error(`standings source ${res.status}`);
  const data = (await res.json()) as RawData;

  const table = new Map<string, Acc>();
  const ensure = (name: string, group: string): Acc => {
    let a = table.get(name);
    if (!a) {
      a = {
        code: flagCode(name) ?? "",
        name,
        group,
        played: 0,
        won: 0,
        drawn: 0,
        lost: 0,
        gf: 0,
        ga: 0,
        cleanSheets: 0,
        form: [],
      };
      table.set(name, a);
    }
    return a;
  };

  let matchesPlayed = 0;

  for (const m of data.matches) {
    // Only real group-stage games between two real nations.
    if (!m.group || !isRealTeam(m.team1) || !isRealTeam(m.team2)) continue;
    const t1 = ensure(m.team1, m.group);
    const t2 = ensure(m.team2, m.group);

    const ft = m.score?.ft;
    if (!ft || ft.length !== 2) continue; // unplayed
    const [g1, g2] = ft;
    matchesPlayed += 1;

    t1.played += 1;
    t2.played += 1;
    t1.gf += g1;
    t1.ga += g2;
    t2.gf += g2;
    t2.ga += g1;
    if (g2 === 0) t1.cleanSheets += 1;
    if (g1 === 0) t2.cleanSheets += 1;

    if (g1 > g2) {
      t1.won += 1;
      t2.lost += 1;
      t1.form.push("W");
      t2.form.push("L");
    } else if (g1 < g2) {
      t2.won += 1;
      t1.lost += 1;
      t2.form.push("W");
      t1.form.push("L");
    } else {
      t1.drawn += 1;
      t2.drawn += 1;
      t1.form.push("D");
      t2.form.push("D");
    }
  }

  const all: TeamRow[] = [...table.values()].map((a) => {
    const points = a.won * 3 + a.drawn;
    return {
      code: a.code,
      name: a.name,
      group: a.group,
      played: a.played,
      won: a.won,
      drawn: a.drawn,
      lost: a.lost,
      goalsFor: a.gf,
      goalsAgainst: a.ga,
      goalDiff: a.gf - a.ga,
      points,
      cleanSheets: a.cleanSheets,
      form: a.form.slice(-5),
      goalsPerGame: a.played ? +(a.gf / a.played).toFixed(2) : 0,
      winPct: a.played ? Math.round((a.won / a.played) * 100) : 0,
    };
  });

  // Sort within group (Pts, GD, GF) for display; overall list sorted same.
  const cmp = (x: TeamRow, y: TeamRow) =>
    y.points - x.points ||
    y.goalDiff - x.goalDiff ||
    y.goalsFor - x.goalsFor ||
    x.name.localeCompare(y.name);

  const byGroup = new Map<string, TeamRow[]>();
  for (const t of all) {
    if (!byGroup.has(t.group)) byGroup.set(t.group, []);
    byGroup.get(t.group)!.push(t);
  }
  const groups = [...byGroup.entries()]
    .map(([group, teams]) => ({ group, teams: teams.sort(cmp) }))
    .sort((a, b) => a.group.localeCompare(b.group));

  return {
    groups,
    all: all.sort(cmp),
    matchesPlayed,
    source: SOURCE_URL,
    fetchedAt: new Date().toISOString(),
  };
}
