import { Flag } from "./Flag";
import type { Bracket, BracketMatch, BracketRound, BracketSlot } from "@/lib/types";

/** Where an R32 team came from in the group stage (1st / 2nd / 3rd place). */
function originBadge(label: string): string | null {
  const m = label.match(/^([123])/);
  if (!m) return null;
  return m[1] === "1" ? "1st" : m[1] === "2" ? "2nd" : "3rd";
}

function SlotRow({
  slot,
  winner,
  showOrigin,
}: {
  slot: BracketSlot;
  winner: boolean;
  showOrigin: boolean;
}) {
  const t = slot.team;
  const origin = showOrigin ? originBadge(slot.label) : null;
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 ${
        winner ? "bg-win/[0.09]" : ""
      }`}
    >
      {t ? (
        <>
          <Flag code={t.code} name={t.name} size={18} />
          <span
            className={`text-sm truncate ${
              winner ? "font-semibold text-foreground" : "text-muted"
            }`}
          >
            {t.name}
          </span>
          {origin && (
            <span className="text-[9px] uppercase tracking-wide rounded bg-surface-2 border border-border px-1 py-px text-muted/80">
              {origin}
            </span>
          )}
          <span className="ml-auto pl-1 text-[10px] text-muted tabular-nums">
            {winner && "✓ "}#{t.overallRank}
          </span>
        </>
      ) : (
        <span className="text-sm text-muted/60 italic">{slot.label}</span>
      )}
    </div>
  );
}

function MatchCard({ m, round }: { m: BracketMatch; round: BracketRound }) {
  const homeWins = !!(m.winner?.team && m.winner.team === m.home.team);
  const awayWins = !!(m.winner?.team && m.winner.team === m.away.team);
  const showOrigin = round === "Round of 32";
  return (
    <div className="rounded-lg bg-surface border border-border overflow-hidden w-[210px] divide-y divide-border/60 shrink-0">
      <SlotRow slot={m.home} winner={homeWins} showOrigin={showOrigin} />
      <SlotRow slot={m.away} winner={awayWins} showOrigin={showOrigin} />
      <div className="px-2 py-1 text-[10px] text-muted/70 flex items-center justify-between">
        <span>
          {m.date
            ? new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })
            : `Match ${m.num}`}
        </span>
        <span className={m.decided ? "text-win" : ""}>
          {m.decided ? "final" : "projected"}
        </span>
      </div>
    </div>
  );
}

export function BracketView({ bracket }: { bracket: Bracket }) {
  // Render the main tree (everything except the 3rd-place playoff) as aligned columns.
  const treeRounds = bracket.rounds.filter((r) => r.round !== "Match for third place");
  const thirdPlace = bracket.rounds.find((r) => r.round === "Match for third place");

  return (
    <div className="space-y-4">
      <div className="rounded-xl glow-edge-soft bg-surface px-4 py-3 text-sm text-muted">
        Knockout bracket <span className="text-foreground">projected from current standings</span>.
        Round-of-32 spots come from each group&apos;s top two (
        <span className="text-muted/80">1st/2nd</span>) plus the eight best third-placed teams (
        <span className="text-muted/80">3rd</span>), slotted into their fixed bracket positions. Each
        later round advances the higher-ranked team (shown by <span className="tabular-nums">#</span> WC
        rank) so every matchup is one that could really happen — and real results (
        <span className="text-win">final</span>) replace projections as games are played.
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-5 items-stretch min-w-max min-h-[640px]">
          {treeRounds.map((r) => (
            <div key={r.round} className="flex flex-col">
              <div className="text-xs uppercase tracking-wider text-blue-bright font-semibold mb-2">
                {r.round}
                <span className="text-muted font-normal"> · {r.matches.length}</span>
              </div>
              <div className="flex flex-col justify-around flex-1 gap-3">
                {r.matches.map((m) => (
                  <MatchCard key={m.num} m={m} round={r.round} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {thirdPlace && (
        <div className="flex items-center gap-3">
          <span className="text-xs uppercase tracking-wider text-de-gold font-semibold">
            3rd-place playoff
          </span>
          {thirdPlace.matches.map((m) => (
            <MatchCard key={m.num} m={m} round={m.round} />
          ))}
        </div>
      )}
    </div>
  );
}
