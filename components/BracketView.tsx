import { Flag } from "./Flag";
import type { Bracket, BracketMatch, BracketSlot } from "@/lib/types";

function SlotRow({ slot, winner }: { slot: BracketSlot; winner: boolean }) {
  const t = slot.team;
  return (
    <div
      className={`flex items-center gap-2 px-2 py-1.5 ${
        winner ? "bg-win/[0.07]" : ""
      }`}
    >
      {t ? (
        <>
          <Flag code={t.code} name={t.name} size={18} />
          <span className={`text-sm truncate ${winner ? "font-semibold text-foreground" : "text-muted"}`}>
            {t.name}
          </span>
          {!slot.actual && (
            <span className="ml-auto text-[9px] uppercase tracking-wide text-muted/70">
              proj
            </span>
          )}
          <span className="ml-auto text-[10px] text-muted tabular-nums">
            {t.code ? `#${t.overallRank}` : ""}
          </span>
        </>
      ) : (
        <span className="text-sm text-muted/60 italic">{slot.label}</span>
      )}
    </div>
  );
}

function MatchCard({ m }: { m: BracketMatch }) {
  const homeWins = m.winner?.team && m.winner.team === m.home.team;
  const awayWins = m.winner?.team && m.winner.team === m.away.team;
  return (
    <div className="rounded-lg bg-surface border border-border overflow-hidden w-[200px] divide-y divide-border/60">
      <SlotRow slot={m.home} winner={!!homeWins} />
      <SlotRow slot={m.away} winner={!!awayWins} />
      {m.date && (
        <div className="px-2 py-1 text-[10px] text-muted/70 flex items-center justify-between">
          <span>{new Date(m.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
          <span>{m.decided ? "final" : "projected"}</span>
        </div>
      )}
    </div>
  );
}

export function BracketView({ bracket }: { bracket: Bracket }) {
  return (
    <div className="space-y-4">
      <div className="rounded-xl glow-edge-soft bg-surface px-4 py-3 text-sm text-muted">
        Knockout bracket <span className="text-foreground">projected from current standings</span>.
        Round-of-32 slots are filled from current group positions and the best
        third-placed teams; later rounds advance the higher-ranked team (
        <span className="text-muted/80">proj</span>). Real results replace projections automatically as games are played.
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex gap-6 min-w-max">
          {bracket.rounds.map((r) => (
            <div key={r.round} className="flex flex-col gap-3">
              <div className="text-xs uppercase tracking-wider text-blue-bright font-semibold sticky top-0">
                {r.round}
                <span className="text-muted font-normal"> · {r.matches.length}</span>
              </div>
              <div className="flex flex-col gap-3 justify-around h-full">
                {r.matches.map((m) => (
                  <MatchCard key={m.num} m={m} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
