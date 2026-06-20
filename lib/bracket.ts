import { isRealTeam } from "./countries";
import type { StandingsResult, KnockoutTemplate } from "./standings";
import type {
  Bracket,
  BracketMatch,
  BracketRound,
  BracketSlot,
  TeamRow,
} from "./types";

const ROUND_ORDER: BracketRound[] = [
  "Round of 32",
  "Round of 16",
  "Quarter-final",
  "Semi-final",
  "Match for third place",
  "Final",
];

const empty = (label: string): BracketSlot => ({ team: null, label, actual: false });

/**
 * Build a knockout bracket projected from the current standings.
 * - R32 slots (1A, 2B, 3A/B/C/D/F) are filled from current group positions /
 *   best third-placed teams.
 * - Winner/loser slots (W74, L101) are resolved from earlier matches: a real
 *   played result decides the winner; otherwise the better-ranked team is
 *   projected to advance.
 * As the source fills in real teams & scores, those take over automatically.
 */
export function buildBracket(standings: StandingsResult): Bracket {
  const { groups, all, knockout } = standings;
  const byName = new Map(all.map((t) => [t.name, t]));

  // group letter ("A") -> teams sorted by current standing
  const groupTeams = new Map<string, TeamRow[]>();
  for (const g of groups) groupTeams.set(g.group.replace("Group ", ""), g.teams);

  // Best third-placed teams overall (already globally ranked).
  const thirds = all
    .filter((t) => t.groupRank === 3)
    .sort((a, b) => a.overallRank - b.overallRank);
  const usedThirds = new Set<string>();

  function assignThird(label: string): BracketSlot {
    const allowed = label.slice(1).split("/"); // "3A/B/C/D/F" -> [A,B,C,D,F]
    for (const t of thirds) {
      const letter = t.group.replace("Group ", "");
      if (allowed.includes(letter) && !usedThirds.has(t.name)) {
        usedThirds.add(t.name);
        return { team: t, label, actual: false };
      }
    }
    return empty(label);
  }

  const winners = new Map<number, BracketSlot>();
  const losers = new Map<number, BracketSlot>();

  function resolveSlot(label: string): BracketSlot {
    if (isRealTeam(label)) {
      const t = byName.get(label) ?? null;
      return { team: t, label, actual: true };
    }
    let m: RegExpMatchArray | null;
    if ((m = label.match(/^([12])([A-L])$/))) {
      const teams = groupTeams.get(m[2]) ?? [];
      const t = teams[Number(m[1]) - 1] ?? null;
      return { team: t, label, actual: false };
    }
    if (/^3[A-L/]+$/.test(label)) return assignThird(label);
    if ((m = label.match(/^W(\d+)$/))) return winners.get(Number(m[1])) ?? empty(label);
    if ((m = label.match(/^L(\d+)$/))) return losers.get(Number(m[1])) ?? empty(label);
    return empty(label);
  }

  function decide(home: BracketSlot, away: BracketSlot, score?: [number, number]) {
    if (!home.team && !away.team)
      return { winner: null, loser: null, decided: false };
    if (!home.team) return { winner: project(away), loser: null, decided: false };
    if (!away.team) return { winner: project(home), loser: null, decided: false };

    if (score && score[0] !== score[1]) {
      const homeWon = score[0] > score[1];
      return {
        winner: confirm(homeWon ? home : away),
        loser: confirm(homeWon ? away : home),
        decided: true,
      };
    }
    // No (decisive) result yet -> project the better-ranked team through.
    const homeBetter = home.team.overallRank <= away.team.overallRank;
    return {
      winner: project(homeBetter ? home : away),
      loser: project(homeBetter ? away : home),
      decided: false,
    };
  }

  const project = (s: BracketSlot): BracketSlot => ({
    team: s.team,
    label: s.team?.name ?? s.label,
    actual: false,
  });
  const confirm = (s: BracketSlot): BracketSlot => ({
    team: s.team,
    label: s.team?.name ?? s.label,
    actual: true,
  });

  // Process rounds in order so winners feed forward.
  const ordered = [...knockout].sort(
    (a, b) =>
      ROUND_ORDER.indexOf(a.round as BracketRound) -
        ROUND_ORDER.indexOf(b.round as BracketRound) || a.num - b.num,
  );

  const built: BracketMatch[] = ordered.map((k: KnockoutTemplate) => {
    const home = resolveSlot(k.team1);
    const away = resolveSlot(k.team2);
    const { winner, loser, decided } = decide(home, away, k.score);
    if (winner) winners.set(k.num, winner);
    if (loser) losers.set(k.num, loser);
    return {
      num: k.num,
      round: k.round as BracketRound,
      date: k.date,
      home,
      away,
      winner,
      decided,
    };
  });

  const rounds = ROUND_ORDER.map((round) => ({
    round,
    matches: built.filter((m) => m.round === round).sort((a, b) => a.num - b.num),
  })).filter((r) => r.matches.length > 0);

  return { rounds };
}
