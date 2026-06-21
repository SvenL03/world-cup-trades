"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { Flag } from "./Flag";
import { formatET } from "@/lib/datetime";
import type { Bracket, BracketMatch, BracketRound, BracketSlot, TeamRow } from "@/lib/types";

type Conn = { src: string; dst: string; kind: "group" | "tree" };

const groupLetter = (g: string) => g.replace("Group ", "");

/** Which group + position an R32 slot is fed by. */
function sourceOf(slot: BracketSlot): { letter: string; rank: number } | null {
  const m = slot.label.match(/^([12])([A-L])$/);
  if (m) return { letter: m[2], rank: Number(m[1]) };
  if (/^3/.test(slot.label) && slot.team)
    return { letter: groupLetter(slot.team.group), rank: 3 };
  if (slot.team) return { letter: groupLetter(slot.team.group), rank: slot.team.groupRank };
  return null;
}

function originBadge(label: string): string | null {
  const m = label.match(/^([123])([A-L])?/);
  if (!m) return null;
  if (m[1] === "3") return "3rd";
  return `${m[1] === "1" ? "1st" : "2nd"}${m[2] ?? ""}`;
}

export function BracketView({
  bracket,
  groups,
}: {
  bracket: Bracket;
  groups: { group: string; teams: TeamRow[] }[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodes = useRef(new Map<string, HTMLElement>());
  const [lines, setLines] = useState<{ d: string; kind: Conn["kind"] }[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const reg = useCallback(
    (key: string) => (el: HTMLElement | null) => {
      if (el) nodes.current.set(key, el);
      else nodes.current.delete(key);
    },
    [],
  );

  const treeRounds = bracket.rounds.filter((r) => r.round !== "Match for third place");
  const thirdPlace = bracket.rounds.find((r) => r.round === "Match for third place");

  // Build the connection list (group→R32 + each feeder→match).
  const connections: Conn[] = [];
  const r32 = bracket.rounds.find((r) => r.round === "Round of 32")?.matches ?? [];
  const qualifyingThirds = new Set<string>();
  for (const m of r32) {
    for (const [side, slot] of [["home", m.home], ["away", m.away]] as const) {
      const s = sourceOf(slot);
      if (!s) continue;
      if (s.rank === 3 && slot.team) qualifyingThirds.add(slot.team.name);
      connections.push({ src: `pos:${s.letter}:${s.rank}`, dst: `slot:${m.num}:${side}`, kind: "group" });
    }
  }
  for (const r of bracket.rounds)
    for (const m of r.matches)
      for (const f of m.feeders)
        connections.push({ src: `match:${f}`, dst: `match:${m.num}`, kind: "tree" });

  const recompute = useCallback(() => {
    const c = containerRef.current;
    if (!c) return;
    const cr = c.getBoundingClientRect();
    setSize({ w: c.scrollWidth, h: c.scrollHeight });
    const out: { d: string; kind: Conn["kind"] }[] = [];
    for (const conn of connections) {
      const s = nodes.current.get(conn.src);
      const d = nodes.current.get(conn.dst);
      if (!s || !d) continue;
      const sr = s.getBoundingClientRect();
      const dr = d.getBoundingClientRect();
      const x1 = sr.right - cr.left;
      const y1 = sr.top - cr.top + sr.height / 2;
      const x2 = dr.left - cr.left;
      const y2 = dr.top - cr.top + dr.height / 2;
      if (x2 < x1) continue; // skip backward/degenerate
      const dx = Math.max(24, (x2 - x1) / 2);
      out.push({ d: `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`, kind: conn.kind });
    }
    setLines(out);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bracket]);

  useLayoutEffect(() => {
    recompute();
    const t = setTimeout(recompute, 400); // after flags/fonts settle
    const ro = new ResizeObserver(recompute);
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener("resize", recompute);
    return () => {
      clearTimeout(t);
      ro.disconnect();
      window.removeEventListener("resize", recompute);
    };
  }, [recompute]);

  return (
    <div className="space-y-4">
      <div className="rounded-xl glow-edge-soft bg-surface px-4 py-3 text-sm text-muted">
        Projected from current standings, in <span className="text-foreground">Eastern Time</span>.
        Grey lines trace how each group&apos;s <span className="text-foreground">top two</span> and the
        eight best <span className="text-foreground">third-placed</span> teams flow into the Round of 32;
        later rounds advance the higher-ranked team (#WC rank). Real results replace projections as games finish.
      </div>

      <div className="overflow-x-auto pb-4">
        <div ref={containerRef} className="relative flex gap-6 items-stretch min-w-max min-h-[760px]">
          {/* flow lines */}
          <svg
            className="absolute inset-0 pointer-events-none z-0"
            width={size.w}
            height={size.h}
          >
            {lines.map((l, i) => (
              <path
                key={i}
                d={l.d}
                fill="none"
                stroke={l.kind === "group" ? "rgba(170,182,205,0.22)" : "rgba(120,170,235,0.30)"}
                strokeWidth={1.25}
              />
            ))}
          </svg>

          {/* Group stage */}
          <div className="relative z-10 flex flex-col gap-2 w-[178px]">
            <div className="text-xs uppercase tracking-wider text-blue-bright font-semibold">
              Group stage
            </div>
            {groups.map((g) => {
              const letter = groupLetter(g.group);
              return (
                <div key={g.group} className="rounded-lg bg-surface border border-border overflow-hidden">
                  <div className="px-2 py-1 text-[11px] font-semibold text-muted border-b border-border/60">
                    Group {letter}
                  </div>
                  {g.teams.map((t) => {
                    const rank = t.groupRank;
                    const qualifies =
                      rank <= 2 || (rank === 3 && qualifyingThirds.has(t.name));
                    return (
                      <div
                        key={t.name}
                        ref={reg(`pos:${letter}:${rank}`)}
                        className={`flex items-center gap-1.5 px-2 py-1 text-xs ${
                          qualifies ? "" : "opacity-40"
                        }`}
                      >
                        <span
                          className={`w-3.5 text-[10px] tabular-nums ${
                            rank <= 2 ? "text-win" : rank === 3 && qualifies ? "text-de-gold" : "text-muted"
                          }`}
                        >
                          {rank}
                        </span>
                        <Flag code={t.code} name={t.name} size={15} />
                        <span className="truncate flex-1">{t.name}</span>
                        {rank === 3 && (
                          <span className={`text-[8px] uppercase ${qualifies ? "text-de-gold" : "text-muted/70"}`}>
                            {qualifies ? "▸R32" : "out"}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Knockout columns */}
          {treeRounds.map((r) => (
            <div key={r.round} className="relative z-10 flex flex-col">
              <div className="text-xs uppercase tracking-wider text-blue-bright font-semibold mb-2">
                {r.round}
                <span className="text-muted font-normal"> · {r.matches.length}</span>
              </div>
              <div className="flex flex-col justify-around flex-1 gap-3">
                {r.matches.map((m) => (
                  <MatchCard key={m.num} m={m} round={r.round} reg={reg} />
                ))}
              </div>
              {/* 3rd-place playoff tucked under the Final column */}
              {r.round === "Final" && thirdPlace && (
                <div className="mt-4">
                  <div className="text-[11px] uppercase tracking-wider text-de-gold font-semibold mb-1.5">
                    3rd-place playoff
                  </div>
                  {thirdPlace.matches.map((m) => (
                    <MatchCard key={m.num} m={m} round={m.round} reg={reg} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SlotRow({
  slot,
  side,
  num,
  winner,
  showOrigin,
  reg,
}: {
  slot: BracketSlot;
  side: "home" | "away";
  num: number;
  winner: boolean;
  showOrigin: boolean;
  reg: (k: string) => (el: HTMLElement | null) => void;
}) {
  const t = slot.team;
  const origin = showOrigin ? originBadge(slot.label) : null;
  return (
    <div
      ref={reg(`slot:${num}:${side}`)}
      className={`flex items-center gap-2 px-2 py-1.5 ${winner ? "bg-win/[0.09]" : ""}`}
    >
      {t ? (
        <>
          <Flag code={t.code} name={t.name} size={18} />
          <span className={`text-sm truncate ${winner ? "font-semibold text-foreground" : "text-muted"}`}>
            {t.name}
          </span>
          {origin && (
            <span className="text-[9px] uppercase tracking-wide rounded bg-surface-2 border border-border px-1 py-px text-muted/70">
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

function MatchCard({
  m,
  round,
  reg,
}: {
  m: BracketMatch;
  round: BracketRound;
  reg: (k: string) => (el: HTMLElement | null) => void;
}) {
  const homeWins = !!(m.winner?.team && m.winner.team === m.home.team);
  const awayWins = !!(m.winner?.team && m.winner.team === m.away.team);
  const showOrigin = round === "Round of 32";
  return (
    <div
      ref={reg(`match:${m.num}`)}
      className="rounded-lg bg-surface border border-border overflow-hidden w-[210px] divide-y divide-border/60 shrink-0"
    >
      <SlotRow slot={m.home} side="home" num={m.num} winner={homeWins} showOrigin={showOrigin} reg={reg} />
      <SlotRow slot={m.away} side="away" num={m.num} winner={awayWins} showOrigin={showOrigin} reg={reg} />
      <div className="px-2 py-1 text-[10px] text-muted/70 flex items-center justify-between">
        <span>{formatET(m.date, m.time)}</span>
        <span className={m.decided ? "text-win" : ""}>{m.decided ? "final" : "projected"}</span>
      </div>
    </div>
  );
}
